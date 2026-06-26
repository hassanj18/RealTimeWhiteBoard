using System.Text.Json;
using System.Text.Json.Serialization;
using SnapshotService.Models.Domain;
using SnapshotService.Models.Events;
using SnapshotService.Models.Events.Payloads;

namespace SnapshotService.Services;

public sealed class BoardEventApplier
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public bool TryApply(BoardState state, BoardEventPayload payload)
    {
        if (!payload.IsDrawingEvent())
        {
            return false;
        }

        var actionType = payload.GetActionType();
        if (actionType is null || string.IsNullOrEmpty(payload.ObjectId))
        {
            return false;
        }

        return actionType switch
        {
            BoardActionType.ADD_SHAPE => ApplyAddShape(state, payload),
            BoardActionType.ADD_TEXT => ApplyAddText(state, payload),
            BoardActionType.DRAW_STROKE => ApplyDrawStroke(state, payload),
            BoardActionType.MOVE_OBJECT => ApplyMoveObject(state, payload),
            BoardActionType.UPDATE_OBJECT => ApplyUpdateObject(state, payload),
            BoardActionType.DELETE_OBJECT => ApplyDeleteObject(state, payload),
            _ => false
        };
    }

    private static bool ApplyAddShape(BoardState state, BoardEventPayload payload)
    {
        var shapePayload = Deserialize<AddShapePayload>(payload.Payload);
        if (shapePayload is null)
        {
            return false;
        }

        state.Objects[payload.ObjectId!] = new BoardObjectState
        {
            ObjectId = payload.ObjectId!,
            Kind = MapShapeKind(shapePayload.Shape),
            X = shapePayload.X,
            Y = shapePayload.Y,
            Size = shapePayload.Size,
            Width = shapePayload.Width,
            Height = shapePayload.Height,
            Radius = shapePayload.Radius,
            StrokeColor = shapePayload.StrokeColor,
            FillColor = shapePayload.FillColor,
            LineWidth = shapePayload.LineWidth,
            CreatedByUserId = payload.UserId,
            UpdatedAt = payload.Timestamp
        };

        return true;
    }

    private static bool ApplyAddText(BoardState state, BoardEventPayload payload)
    {
        var textPayload = Deserialize<AddTextPayload>(payload.Payload);
        if (textPayload is null)
        {
            return false;
        }

        state.Objects[payload.ObjectId!] = new BoardObjectState
        {
            ObjectId = payload.ObjectId!,
            Kind = ObjectKind.Text,
            X = textPayload.X,
            Y = textPayload.Y,
            Width = textPayload.Width,
            Height = textPayload.Height,
            Text = textPayload.Text,
            Font = textPayload.Font,
            Color = textPayload.Color,
            CreatedByUserId = payload.UserId,
            UpdatedAt = payload.Timestamp
        };

        return true;
    }

    private static bool ApplyDrawStroke(BoardState state, BoardEventPayload payload)
    {
        var strokePayload = Deserialize<DrawStrokePayload>(payload.Payload);
        if (strokePayload is null)
        {
            return false;
        }

        state.Objects[payload.ObjectId!] = new BoardObjectState
        {
            ObjectId = payload.ObjectId!,
            Kind = ObjectKind.Stroke,
            X = strokePayload.Points[0].X,
            Y = strokePayload.Points[0].Y,
            Points = strokePayload.Points,
            Color = strokePayload.Color,
            LineWidth = strokePayload.LineWidth,
            CreatedByUserId = payload.UserId,
            UpdatedAt = payload.Timestamp
        };

        return true;
    }

    private static bool ApplyMoveObject(BoardState state, BoardEventPayload payload)
    {
        if (!state.Objects.TryGetValue(payload.ObjectId!, out var obj))
        {
            return false;
        }

        var movePayload = Deserialize<MoveObjectPayload>(payload.Payload);
        if (movePayload is null)
        {
            return false;
        }

        var dx = movePayload.X - obj.X;
        var dy = movePayload.Y - obj.Y;

        obj.X = movePayload.X;
        obj.Y = movePayload.Y;

        if (obj.Kind == ObjectKind.Stroke && obj.Points is { Count: > 0 })
        {
            foreach (var point in obj.Points)
            {
                point.X += dx;
                point.Y += dy;
            }
        }

        obj.UpdatedAt = payload.Timestamp;
        return true;
    }

    private static bool ApplyUpdateObject(BoardState state, BoardEventPayload payload)
    {
        if (!state.Objects.TryGetValue(payload.ObjectId!, out var obj))
        {
            return false;
        }

        var updatePayload = Deserialize<UpdateObjectPayload>(payload.Payload);
        if (updatePayload is null)
        {
            return false;
        }

        var hasChanges = false;

        if (updatePayload.Size.HasValue) { obj.Size = updatePayload.Size; hasChanges = true; }
        if (updatePayload.Width.HasValue) { obj.Width = updatePayload.Width; hasChanges = true; }
        if (updatePayload.Height.HasValue) { obj.Height = updatePayload.Height; hasChanges = true; }
        if (updatePayload.Radius.HasValue) { obj.Radius = updatePayload.Radius; hasChanges = true; }
        if (updatePayload.LineWidth.HasValue) { obj.LineWidth = updatePayload.LineWidth; hasChanges = true; }
        if (updatePayload.Font is not null) { obj.Font = updatePayload.Font; hasChanges = true; }
        if (updatePayload.StrokeColor is not null) { obj.StrokeColor = updatePayload.StrokeColor; hasChanges = true; }
        if (updatePayload.FillColor is not null) { obj.FillColor = updatePayload.FillColor; hasChanges = true; }
        if (updatePayload.Color is not null) { obj.Color = updatePayload.Color; hasChanges = true; }
        if (updatePayload.Text is not null) { obj.Text = updatePayload.Text; hasChanges = true; }
        if (updatePayload.X.HasValue) { obj.X = updatePayload.X.Value; hasChanges = true; }
        if (updatePayload.Y.HasValue) { obj.Y = updatePayload.Y.Value; hasChanges = true; }

        if (!hasChanges)
        {
            return false;
        }

        obj.UpdatedAt = payload.Timestamp;
        return true;
    }

    private static bool ApplyDeleteObject(BoardState state, BoardEventPayload payload)
    {
        return state.Objects.Remove(payload.ObjectId!);
    }

    private static ObjectKind MapShapeKind(ShapeKind shape) => shape switch
    {
        ShapeKind.square => ObjectKind.Square,
        ShapeKind.rectangle => ObjectKind.Rectangle,
        ShapeKind.circle => ObjectKind.Circle,
        ShapeKind.triangle => ObjectKind.Triangle,
        _ => ObjectKind.Square
    };

    private static T? Deserialize<T>(JsonElement element)
    {
        if (element.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
        {
            return default;
        }

        try
        {
            return element.Deserialize<T>(JsonOptions);
        }
        catch (JsonException)
        {
            return default;
        }
    }
}
