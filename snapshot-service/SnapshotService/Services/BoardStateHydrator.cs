using Microsoft.EntityFrameworkCore;
using SnapshotService.Data;
using SnapshotService.Models.Domain;

namespace SnapshotService.Services;

public sealed class BoardStateHydrator
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BoardStateHydrator> _logger;

    public BoardStateHydrator(IServiceScopeFactory scopeFactory, ILogger<BoardStateHydrator> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task EnsureHydratedAsync(BoardState state, CancellationToken cancellationToken = default)
    {
        if (state.Objects.Count > 0 || state.IsHydrated)
        {
            return;
        }

        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<SnapshotDbContext>();

        var snapshot = await db.BoardSnapshots
            .AsNoTracking()
            .Where(s => s.BoardId == state.BoardId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (snapshot is null || snapshot.Objects.Count == 0)
        {
            state.IsHydrated = true;
            return;
        }

        lock (state.SyncRoot)
        {
            if (state.Objects.Count > 0)
            {
                return;
            }

            foreach (var obj in snapshot.Objects)
            {
                state.Objects[obj.ObjectId] = CloneObject(obj);
            }

            state.LastEventTimestamp = snapshot.LastEventTimestamp;
            state.IsHydrated = true;
        }

        _logger.LogInformation(
            "Hydrated board {BoardId} from snapshot with {ObjectCount} objects",
            state.BoardId,
            snapshot.Objects.Count);
    }

    private static BoardObjectState CloneObject(BoardObjectState source)
    {
        return new BoardObjectState
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
            Points = source.Points?.Select(p => new Point2D { X = p.X, Y = p.Y }).ToList(),
            Color = source.Color,
            Text = source.Text,
            Font = source.Font,
            CreatedByUserId = source.CreatedByUserId,
            UpdatedAt = source.UpdatedAt
        };
    }
}
