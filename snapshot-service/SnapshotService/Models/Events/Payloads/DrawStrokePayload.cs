using SnapshotService.Models.Domain;

namespace SnapshotService.Models.Events.Payloads;

public class DrawStrokePayload
{
    public List<Point2D> Points { get; set; } = [];

    public string Color { get; set; } = string.Empty;

    public double LineWidth { get; set; }
}
