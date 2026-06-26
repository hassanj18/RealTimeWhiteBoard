namespace SnapshotService.Models.Domain;

public enum ObjectKind
{
    Square,
    Rectangle,
    Circle,
    Triangle,
    Stroke,
    Text
}

public class BoardObjectState
{
    public string ObjectId { get; set; } = string.Empty;

    public ObjectKind Kind { get; set; }

    public double X { get; set; }

    public double Y { get; set; }

    public string? StrokeColor { get; set; }

    public string? FillColor { get; set; }

    public double? LineWidth { get; set; }

    public double? Size { get; set; }

    public double? Width { get; set; }

    public double? Height { get; set; }

    public double? Radius { get; set; }

    public List<Point2D>? Points { get; set; }

    public string? Color { get; set; }

    public string? Text { get; set; }

    public string? Font { get; set; }

    public string? CreatedByUserId { get; set; }

    public long UpdatedAt { get; set; }
}
