using Microsoft.EntityFrameworkCore;
using MongoDB.EntityFrameworkCore.Extensions;
using SnapshotService.Models.Domain;
using SnapshotService.Models.Entities;

namespace SnapshotService.Data;

public static class SnapshotDbSchema
{
    public const string BoardSnapshotsCollection = "board_snapshots";

    public static void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BoardSnapshot>(entity =>
        {
            entity.ToCollection(BoardSnapshotsCollection);
            entity.HasKey(snapshot => snapshot.Id);
            entity.Property(snapshot => snapshot.BoardId).IsRequired();
            entity.OwnsMany(snapshot => snapshot.Objects, navigationBuilder =>
            {
                navigationBuilder.Property(obj => obj.ObjectId).IsRequired();
            });
        });
    }
}
