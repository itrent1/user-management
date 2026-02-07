using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserManagementApi.Data;
using UserManagementApi.Models;
using System.Security.Cryptography;
using System.Text;
using Npgsql;

namespace UserManagementApi.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuthController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) ||
            string.IsNullOrWhiteSpace(dto.Email) ||
            string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Please fill in all fields." });

        var email = dto.Email.Trim().ToLower();
        var confirmationToken = Guid.NewGuid().ToString("N");

        var user = new User
        {
            Name = dto.Name.Trim(),
            Email = email,
            PasswordHash = Hash(dto.Password),
            Status = UserStatus.Unverified,
            ConfirmationToken = confirmationToken,
            EmailConfirmedAt = null
        };

        _db.Users.Add(user);

        try
        {
            await _db.SaveChangesAsync();

            var confirmLink = $"{Request.Scheme}://{Request.Host}/auth/confirm?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(confirmationToken)}";
            return Ok(new
            {
                message = "Registered",
                confirmationToken,
                confirmLink
            });
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg && pg.SqlState == "23505")
        {
            return Conflict(new { message = "Email already exists." });
        }
    }

    [HttpPost("confirm")]
    public async Task<IActionResult> ConfirmEmail(ConfirmDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Token))
            return BadRequest(new { message = "Email and token are required." });

        var email = dto.Email.Trim().ToLower();
        var token = dto.Token.Trim();

        var user = await _db.Users.FirstOrDefaultAsync(x => x.Email == email);

        if (user == null)
            return NotFound(new { message = "User not found." });

        if (user.EmailConfirmedAt.HasValue || user.Status == UserStatus.Active)
            return Ok(new { message = "Already confirmed." });

        if (user.ConfirmationToken == null || !string.Equals(user.ConfirmationToken, token, StringComparison.Ordinal))
            return Unauthorized(new { message = "Invalid token." });

        user.EmailConfirmedAt = DateTime.UtcNow;
        user.ConfirmationToken = null;
        user.Status = UserStatus.Active;

        await _db.SaveChangesAsync();

        return Ok(new { message = "Confirmed" });
    }

    [HttpGet("confirm")]
    public async Task<IActionResult> ConfirmFromLink([FromQuery] string email, [FromQuery] string token)
    {
        return await ConfirmEmail(new ConfirmDto(email, token));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Email and password are required." });

        var email = dto.Email.Trim().ToLower();
        var hash = Hash(dto.Password);

        var user = await _db.Users.FirstOrDefaultAsync(x => x.Email == email);

        if (user == null)
            return Unauthorized(new { message = "User not found." });

        if (user.PasswordHash != hash)
            return Unauthorized(new { message = "Wrong password." });

        if (user.Status == UserStatus.Unverified)
            return Unauthorized(new { message = "Please confirm your email first." });

        if (user.Status == UserStatus.Blocked)
            return Unauthorized(new { message = "User blocked." });

        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { token = user.Id });
    }

    private string Hash(string input)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(input));
        return Convert.ToBase64String(bytes);
    }
}

public record RegisterDto(string Name, string Email, string Password);
public record LoginDto(string Email, string Password);

public record ConfirmDto(string Email, string Token);
