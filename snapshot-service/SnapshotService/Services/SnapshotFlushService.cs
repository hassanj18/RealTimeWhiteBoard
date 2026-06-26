using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using SnapshotService.Configuration;
using SnapshotService.Data;
using SnapshotService.Models.Entities;

namespace SnapshotService.Services;

public sealed class SnapshotFlushService
{
    private readonly BoardStateManager _boardStateManager;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly SnapshotOptions _options;
    private readonly ILogger<SnapshotFlushService> _logger;

    public SnapshotFlushService(
        BoardStateManager boardStateManager,
        IServiceScopeFactory scopeFactory,
        SnapshotOptions options,
        ILogger<SnapshotFlushService> logger)
    {
        _boardStateManager = boardStateManager;
        _scopeFactory = scopeFactory;
        _options = options;
        _logger = logger;
    }

    public async Task FlushIfDueAsync(BoardState state, CancellationToken cancellationToken)
    {
        var shouldFlush = false;

        lock (state.SyncRoot)
        {
            if (state.EventsSinceLastSnapshot >= _options.EventThreshold)
            {
                shouldFlush = true;
            }
        }

        if (shouldFlush)
        {
            await FlushBoardAsync(state, cancellationToken);
        }
    }

    public async Task FlushTimedBoardsAsync(CancellationToken cancellationToken)
    {
        var cutoff = DateTime.UtcNow.AddSeconds(-_options.IntervalSeconds);

        foreach (var state in _boardStateManager.GetAll())
        {
            var shouldFlush = false;

            lock (state.SyncRoot)
            {
                shouldFlush = state.EventsSinceLastSnapshot > 0 && state.LastSnapshotAt <= cutoff;
            }

            if (shouldFlush)
            {
                await FlushBoardAsync(state, cancellationToken);
            }
        }
    }

    public async Task<bool> FlushBoardAsync(BoardState state, CancellationToken cancellationToken)
    {
        BoardSnapshot snapshot;

        lock (state.SyncRoot)
        {
            if (state.EventsSinceLastSnapshot == 0)
            {
                return false;
            }

            snapshot = new BoardSnapshot
            {
                Id = ObjectId.GenerateNewId(),
                BoardId = state.BoardId,
                CreatedAt = DateTime.UtcNow,
                LastEventTimestamp = state.LastEventTimestamp,
                EventsSincePreviousSnapshot = state.EventsSinceLastSnapshot,
                Objects = state.Objects.Values
                    .Select(CloneObject)
                    .ToList()
            };

            state.EventsSinceLastSnapshot = 0;
            state.LastSnapshotAt = DateTime.UtcNow;
        }

        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<SnapshotDbContext>();
        db.BoardSnapshots.Add(snapshot);
        await db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Saved snapshot for board {BoardId} with {ObjectCount} objects after {EventCount} events",
            snapshot.BoardId,
            snapshot.Objects.Count,
            snapshot.EventsSincePreviousSnapshot);

        return true;
    }

    private static Models.Domain.BoardObjectState CloneObject(Models.Domain.BoardObjectState source)
    {
        return new Models.Domain.BoardObjectState
        {
            ObjectId = source.ObjectId,
            Kind = source.Kind,
            X = source.X,
            Y = source.Y,
            StrokeColor = source.StrokeColor,
            FillColor = source.FillColor,
            LineWidth = source.LineWidth,
            Size = source.Size,
            Width = source.Width,
            Height = source.Height,
            Radius = source.Radius,
            Points = source.Points?.Select(p => new Models.Domain.Point2D { X = p.X, Y = p.Y }).ToList(),
            Color = source.Color,
            Text = source.Text,
            Font = source.Font,
            CreatedByUserId = source.CreatedByUserId,
            UpdatedAt = source.UpdatedAt
        };
    }
}
