using SnapshotService.Models.Events;

namespace SnapshotService.Models.Events.Payloads;

public class AddShapePayload
{
    public ShapeKind Shape { get; set; }

    public double X { get; set; }

    public double Y { get; set; }

    public double? Size { get; set; }

    public double? Width { get; set; }

    public double? Height { get; set; }

    public double? Radius { get; set; }

    public string StrokeColor { get; set; } = string.Empty;

    public string FillColor { get; set; } = string.Empty;

    public double LineWidth { get; set; }
}
