using SnapshotService.Configuration;
using SnapshotService.Services;

namespace SnapshotService.Workers;

public sealed class SnapshotTimerService : BackgroundService
{
    private readonly SnapshotFlushService _flushService;
    private readonly SnapshotOptions _options;
    private readonly ILogger<SnapshotTimerService> _logger;

    public SnapshotTimerService(
        SnapshotFlushService flushService,
        SnapshotOptions options,
        ILogger<SnapshotTimerService> logger)
    {
        _flushService = flushService;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var pollInterval = TimeSpan.FromSeconds(Math.Min(10, Math.Max(1, _options.IntervalSeconds / 6)));

        _logger.LogInformation(
            "Snapshot timer started; flushing boards every {IntervalSeconds}s when dirty",
            _options.IntervalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(pollInterval, stoppingToken);
                await _flushService.FlushTimedBoardsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Snapshot timer flush failed");
            }
        }
    }
}
