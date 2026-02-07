using Microsoft.EntityFrameworkCore;
using UserManagementApi.Models;

namespace UserManagementApi.Data;

public class AppDbContext : DbContext
{
    public DbSet<User> Users => Set<User>();

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var u = modelBuilder.Entity<User>();

        u.Property(x => x.Name).IsRequired();
        u.Property(x => x.Email).IsRequired();

        u.HasIndex(x => x.Email).IsUnique();

        u.Property(x => x.Status).HasConversion<int>();

        u.Property(x => x.ConfirmationToken);
        u.Property(x => x.EmailConfirmedAt);
    }
}
