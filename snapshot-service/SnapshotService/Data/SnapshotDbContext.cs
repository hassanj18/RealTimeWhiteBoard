using Microsoft.EntityFrameworkCore;
using SnapshotService.Models.Entities;

namespace SnapshotService.Data;

public class SnapshotDbContext : DbContext
{
    public SnapshotDbContext(DbContextOptions<SnapshotDbContext> options)
        : base(options)
    {
    }

    public DbSet<BoardSnapshot> BoardSnapshots => Set<BoardSnapshot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        SnapshotDbSchema.Configure(modelBuilder);
    }
}
