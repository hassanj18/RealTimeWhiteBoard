using Microsoft.EntityFrameworkCore;
using MongoDB.EntityFrameworkCore.Extensions;
using MongoDB.Driver;
using SnapshotService.Configuration;
using SnapshotService.Data;
using SnapshotService.Services;
using SnapshotService.Workers;

var builder = WebApplication.CreateBuilder(args);

var mongoUri = builder.Configuration["MONGODB_URI"]
    ?? Environment.GetEnvironmentVariable("MONGODB_URI")
    ?? "mongodb://localhost:27017";

var databaseName = builder.Configuration["MongoDb:DatabaseName"] ?? "snapshotDb";

var snapshotOptions = new SnapshotOptions
{
    KafkaBrokers = builder.Configuration["KAFKA_BROKERS"] ?? "localhost:9092",
    KafkaBoardActionsTopic = builder.Configuration["KAFKA_BOARD_ACTIONS_TOPIC"] ?? "boards.actions",
    KafkaConsumerGroupId = builder.Configuration["KAFKA_CONSUMER_GROUP_ID"] ?? "snapshot-service",
    EventThreshold = int.TryParse(builder.Configuration["SNAPSHOT_EVENT_THRESHOLD"], out var threshold) ? threshold : 500,
    IntervalSeconds = int.TryParse(builder.Configuration["SNAPSHOT_INTERVAL_SECONDS"], out var interval) ? interval : 10,
    Port = int.TryParse(builder.Configuration["PORT"], out var port) ? port : 3040
};

builder.Services.AddSingleton(snapshotOptions);
builder.Services.AddSingleton<BoardStateManager>();
builder.Services.AddSingleton<BoardEventApplier>();
builder.Services.AddSingleton<BoardStateHydrator>();
builder.Services.AddSingleton<SnapshotFlushService>();
builder.Services.AddHostedService<BoardActionsConsumerService>();
builder.Services.AddHostedService<SnapshotTimerService>();

builder.Services.AddSingleton<IMongoClient>(_ => new MongoClient(mongoUri));
builder.Services.AddDbContext<SnapshotDbContext>((serviceProvider, options) =>
{
    var mongoClient = serviceProvider.GetRequiredService<IMongoClient>();
    options.UseMongoDB(mongoClient, databaseName);
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .SetIsOriginAllowed(_ => true)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/snapshots/{boardId}/latest", async (string boardId, SnapshotDbContext db, CancellationToken cancellationToken) =>
{
    var snapshot = await db.BoardSnapshots
        .AsNoTracking()
        .Where(s => s.BoardId == boardId)
        .OrderByDescending(s => s.CreatedAt)
        .FirstOrDefaultAsync(cancellationToken);

    return snapshot is null ? Results.NotFound() : Results.Ok(snapshot);
});

app.Run($"http://0.0.0.0:{snapshotOptions.Port}");
