using MongoDB.Bson;
using SnapshotService.Models.Domain;

namespace SnapshotService.Models.Entities;

public class BoardSnapshot
{
    public ObjectId Id { get; set; }

    public string BoardId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public long LastEventTimestamp { get; set; }

    public int EventsSincePreviousSnapshot { get; set; }

    public List<BoardObjectState> Objects { get; set; } = [];
}
