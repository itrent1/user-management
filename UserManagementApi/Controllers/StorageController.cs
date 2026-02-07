using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserManagementApi.Data;

namespace UserManagementApi.Controllers;

[ApiController]
[Route("storage")]
public class StorageController : ControllerBase
{
    private readonly AppDbContext _db;

    public StorageController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("indexes")]
    public async Task<IActionResult> GetIndexes()
    {
        var sql = @"
            SELECT schemaname, tablename, indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'Users'
            ORDER BY indexname;";

        var rows = await _db.Database.SqlQueryRaw<IndexRow>(sql).ToListAsync();

        return Ok(rows);
    }

    public class IndexRow
    {
        public string? schemaname { get; set; }
        public string? tablename { get; set; }
        public string? indexname { get; set; }
        public string? indexdef { get; set; }
    }
}
