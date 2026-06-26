using System.Text.Json;

namespace SnapshotService.Models.Events;

public class BoardEventEnvelope
{
    public string Type { get; set; } = string.Empty;

    public BoardEventPayload Payload { get; set; } = new();
}

public class BoardEventPayload
{
    public string BoardId { get; set; } = string.Empty;

    public string? ObjectId { get; set; }

    public string? Type { get; set; }

    public string? EventType { get; set; }

    public JsonElement Payload { get; set; }

    public string? UserId { get; set; }

    public long Timestamp { get; set; }

    public bool IsDrawingEvent()
    {
        if (!string.IsNullOrEmpty(EventType))
        {
            return false;
        }

        return !string.IsNullOrEmpty(Type)
            && Enum.TryParse<BoardActionType>(Type, ignoreCase: false, out _);
    }

    public BoardActionType? GetActionType()
    {
        if (Type is null)
        {
            return null;
        }

        return Enum.TryParse<BoardActionType>(Type, ignoreCase: false, out var actionType)
            ? actionType
            : null;
    }
}
