using SnapshotService.Models.Domain;

namespace SnapshotService.Services;

public sealed class BoardState
{
    public required string BoardId { get; init; }

    public Dictionary<string, BoardObjectState> Objects { get; } = new(StringComparer.Ordinal);

    public int EventsSinceLastSnapshot { get; set; }

    public long LastEventTimestamp { get; set; }

    public DateTime LastSnapshotAt { get; set; } = DateTime.UtcNow;

    public bool IsHydrated { get; set; }

    public object SyncRoot { get; } = new();
}

public sealed class BoardStateManager
{
    private readonly Dictionary<string, BoardState> _boards = new(StringComparer.Ordinal);

    public BoardState GetOrCreate(string boardId)
    {
        lock (_boards)
        {
            if (!_boards.TryGetValue(boardId, out var state))
            {
                state = new BoardState { BoardId = boardId };
                _boards[boardId] = state;
            }

            return state;
        }
    }

    public IReadOnlyCollection<BoardState> GetAll()
    {
        lock (_boards)
        {
            return _boards.Values.ToList();
        }
    }
}
