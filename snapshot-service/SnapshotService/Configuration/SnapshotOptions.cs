namespace SnapshotService.Configuration;

public class SnapshotOptions
{
    public const string SectionName = "Snapshot";

    public string KafkaBrokers { get; set; } = "localhost:9092";

    public string KafkaBoardActionsTopic { get; set; } = "boards.actions";

    public string KafkaConsumerGroupId { get; set; } = "snapshot-service";

    public int EventThreshold { get; set; } = 500;

    public int IntervalSeconds { get; set; } = 10;

    public int Port { get; set; } = 3040;
}
