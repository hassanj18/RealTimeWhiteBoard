using System.Text.Json.Serialization;

namespace SnapshotService.Models.Events;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum BoardActionType
{
    ADD_SHAPE,
    MOVE_OBJECT,
    UPDATE_OBJECT,
    DRAW_STROKE,
    ADD_TEXT,
    DELETE_OBJECT
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShapeKind
{
    square,
    rectangle,
    circle,
    triangle
}
