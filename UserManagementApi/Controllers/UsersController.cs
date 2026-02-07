using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserManagementApi.Data;
using UserManagementApi.Models;

namespace UserManagementApi.Controllers;

[ApiController]
[Route("users")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db)
    {
        _db = db;
    }

    private Guid? GetCurrentUserId()
    {
        var auth = Request.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(auth) || !auth.StartsWith("Bearer "))
            return null;

        var token = auth.Substring("Bearer ".Length).Trim();
        return Guid.TryParse(token, out var userId) ? userId : null;
    }

    private async Task<User?> GetCurrentUser()
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return null;

        return await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value);
    }

    private async Task<IActionResult?> Guard()
    {
        var me = await GetCurrentUser();
        if (me == null)
            return Unauthorized(new { message = "Please sign in.", forceLogout = true });

        if (me.Status == UserStatus.Blocked)
            return Unauthorized(new { message = "User blocked.", forceLogout = true });

        return null;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers([FromQuery] bool includeCurrent = true)
    {
        var guard = await Guard();
        if (guard != null) return guard;

        var myId = GetCurrentUserId();
        var query = _db.Users.AsQueryable();

        if (!includeCurrent && myId.HasValue)
            query = query.Where(u => u.Id != myId.Value);

        var list = await query
            .OrderByDescending(u => u.LastLoginAt.HasValue)
            .ThenByDescending(u => u.LastLoginAt)
            .ThenBy(u => u.Email)
            .Select(u => new
            {
                id = u.Id,
                name = u.Name,
                email = u.Email,
                lastLoginAt = u.LastLoginAt,
                status = u.Status.ToString()
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("non-current")]
    public Task<IActionResult> GetUsersNonCurrent() => GetUsers(includeCurrent: false);

    public record BatchIdsDto(List<Guid> Ids);

    [HttpPost("block")]
    public async Task<IActionResult> Block([FromBody] BatchIdsDto dto)
    {
        var guard = await Guard();
        if (guard != null) return guard;

        if (dto?.Ids == null || dto.Ids.Count == 0)
            return BadRequest(new { message = "No users selected." });

        var users = await _db.Users.Where(u => dto.Ids.Contains(u.Id)).ToListAsync();
        foreach (var u in users)
            u.Status = UserStatus.Blocked;

        await _db.SaveChangesAsync();

        var myId = GetCurrentUserId();
        if (myId.HasValue && dto.Ids.Contains(myId.Value))
        {
            return Unauthorized(new { message = "You have blocked yourself.", forceLogout = true });
        }

        return Ok(new { message = "Blocked." });
    }

    [HttpPost("unblock")]
    public async Task<IActionResult> Unblock([FromBody] BatchIdsDto dto)
    {
        var guard = await Guard();
        if (guard != null) return guard;

        if (dto?.Ids == null || dto.Ids.Count == 0)
            return BadRequest(new { message = "No users selected." });

        var users = await _db.Users.Where(u => dto.Ids.Contains(u.Id)).ToListAsync();
        foreach (var u in users)
            if (u.Status == UserStatus.Blocked)
                u.Status = UserStatus.Active;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Unblocked." });
    }

    [HttpPost("block-all")]
    public async Task<IActionResult> BlockAll()
    {
        var guard = await Guard();
        if (guard != null) return guard;

        var users = await _db.Users.ToListAsync();
        foreach (var u in users)
            u.Status = UserStatus.Blocked;

        await _db.SaveChangesAsync();

        return Unauthorized(new { message = "All users blocked.", forceLogout = true });
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] BatchIdsDto dto)
    {
        var guard = await Guard();
        if (guard != null) return guard;

        if (dto?.Ids == null || dto.Ids.Count == 0)
            return BadRequest(new { message = "No users selected." });

        var users = await _db.Users.Where(u => dto.Ids.Contains(u.Id)).ToListAsync();
        _db.Users.RemoveRange(users);

        await _db.SaveChangesAsync();

        var myId = GetCurrentUserId();
        if (myId.HasValue && dto.Ids.Contains(myId.Value))
        {
            return Unauthorized(new { message = "Account deleted.", forceLogout = true });
        }

        return Ok(new { message = "Deleted." });
    }

    [HttpPost("delete-unverified")]
    public async Task<IActionResult> DeleteUnverified()
    {
        var me = await GetCurrentUser();
        if (me == null)
            return Unauthorized(new { message = "Please sign in.", forceLogout = true });

        if (me.Status == UserStatus.Blocked)
            return Unauthorized(new { message = "User blocked.", forceLogout = true });

        var users = await _db.Users.Where(u => u.Status == UserStatus.Unverified).ToListAsync();
        _db.Users.RemoveRange(users);

        await _db.SaveChangesAsync();

        if (me.Status == UserStatus.Unverified)
        {
            return Unauthorized(new { message = "Account deleted.", forceLogout = true });
        }

        return Ok(new { message = "Unverified users deleted." });
    }
}