using System.Text.Json;
using Confluent.Kafka;
using SnapshotService.Configuration;
using SnapshotService.Models.Events;
using SnapshotService.Services;

namespace SnapshotService.Workers;

public sealed class BoardActionsConsumerService : BackgroundService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly BoardStateManager _boardStateManager;
    private readonly BoardEventApplier _eventApplier;
    private readonly BoardStateHydrator _hydrator;
    private readonly SnapshotFlushService _flushService;
    private readonly SnapshotOptions _options;
    private readonly ILogger<BoardActionsConsumerService> _logger;

    public BoardActionsConsumerService(
        BoardStateManager boardStateManager,
        BoardEventApplier eventApplier,
        BoardStateHydrator hydrator,
        SnapshotFlushService flushService,
        SnapshotOptions options,
        ILogger<BoardActionsConsumerService> logger)
    {
        _boardStateManager = boardStateManager;
        _eventApplier = eventApplier;
        _hydrator = hydrator;
        _flushService = flushService;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (string.IsNullOrWhiteSpace(_options.KafkaBrokers))
        {
            _logger.LogWarning("Kafka brokers not configured; board actions consumer will not start");
            return;
        }

        var config = new ConsumerConfig
        {
            BootstrapServers = _options.KafkaBrokers,
            GroupId = _options.KafkaConsumerGroupId,
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = true
        };

        using var consumer = new ConsumerBuilder<string, string>(config).Build();
        consumer.Subscribe(_options.KafkaBoardActionsTopic);

        _logger.LogInformation(
            "Consuming board actions from topic {Topic} on {Brokers}",
            _options.KafkaBoardActionsTopic,
            _options.KafkaBrokers);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var result = consumer.Consume(stoppingToken);
                    if (result.Message.Value is null)
                    {
                        continue;
                    }

                    await ProcessMessageAsync(result.Message.Value, stoppingToken);
                }
                catch (ConsumeException ex)
                {
                    _logger.LogError(ex, "Kafka consume error");
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // graceful shutdown
        }
        finally
        {
            consumer.Close();
        }
    }

    private async Task ProcessMessageAsync(string message, CancellationToken cancellationToken)
    {
        BoardEventEnvelope? envelope;

        try
        {
            envelope = JsonSerializer.Deserialize<BoardEventEnvelope>(message, JsonOptions);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize board event");
            return;
        }

        if (envelope is null || envelope.Type != "BOARD_EVENT")
        {
            return;
        }

        var payload = envelope.Payload;
        if (string.IsNullOrEmpty(payload.BoardId) || !payload.IsDrawingEvent())
        {
            return;
        }

        var state = _boardStateManager.GetOrCreate(payload.BoardId);
        await _hydrator.EnsureHydratedAsync(state, cancellationToken);

        var applied = false;

        lock (state.SyncRoot)
        {
            applied = _eventApplier.TryApply(state, payload);
            if (applied)
            {
                state.EventsSinceLastSnapshot++;
                state.LastEventTimestamp = payload.Timestamp;
            }
            else
            {
                _logger.LogDebug(
                    "Skipped event {ActionType} for object {ObjectId} on board {BoardId}",
                    payload.Type,
                    payload.ObjectId,
                    payload.BoardId);
            }
        }

        if (!applied)
        {
            return;
        }

        await _flushService.FlushIfDueAsync(state, cancellationToken);
    }
}
