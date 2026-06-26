namespace SnapshotService.Models.Events.Payloads;

public class UpdateObjectPayload
{
    public double? Size { get; set; }

    public double? Width { get; set; }

    public double? Height { get; set; }

    public double? Radius { get; set; }

    public double? LineWidth { get; set; }

    public string? Font { get; set; }

    public string? StrokeColor { get; set; }

    public string? FillColor { get; set; }

    public string? Color { get; set; }

    public string? Text { get; set; }

    public double? X { get; set; }

    public double? Y { get; set; }
}
