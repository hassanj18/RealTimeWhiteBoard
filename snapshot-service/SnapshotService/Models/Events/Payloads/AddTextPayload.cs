namespace SnapshotService.Models.Events.Payloads;

public class AddTextPayload
{
    public string Text { get; set; } = string.Empty;

    public double X { get; set; }

    public double Y { get; set; }

    public double Width { get; set; }

    public double Height { get; set; }

    public string Font { get; set; } = string.Empty;

    public string Color { get; set; } = string.Empty;
}
