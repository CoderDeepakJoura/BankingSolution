using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Miscalleneous;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Controllers
{
    public class FavouriteDTO
    {
        public string Path { get; set; } = "";
        public string Label { get; set; } = "";
        public string Category { get; set; } = "";
    }

    public class FavouriteResponseDTO
    {
        public int Id { get; set; }
        public string Path { get; set; } = "";
        public string Label { get; set; } = "";
        public string Category { get; set; } = "";
        public int SortOrder { get; set; }
    }

    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class FavouritesController : ControllerBase
    {
        private readonly BankingDbContext _context;

        public FavouritesController(BankingDbContext context)
        {
            _context = context;
        }

        private int GetUserId()
        {
            int.TryParse(User.FindFirst("userId")?.Value, out int userId);
            return userId;
        }

        // GET api/Favourites
        [HttpGet]
        public async Task<IActionResult> GetFavourites()
        {
            var userId = GetUserId();
            if (userId <= 0) return Unauthorized();

            var favs = await _context.userfavourites
                .Where(f => f.UserId == userId)
                .OrderBy(f => f.SortOrder)
                .ThenBy(f => f.CreatedAt)
                .Select(f => new FavouriteResponseDTO
                {
                    Id = f.Id,
                    Path = f.Path,
                    Label = f.Label,
                    Category = f.Category,
                    SortOrder = f.SortOrder
                })
                .ToListAsync();

            return Ok(new { success = true, data = favs });
        }

        // POST api/Favourites
        [HttpPost]
        public async Task<IActionResult> AddFavourite([FromBody] FavouriteDTO dto)
        {
            var userId = GetUserId();
            if (userId <= 0) return Unauthorized();

            if (string.IsNullOrWhiteSpace(dto.Path) || string.IsNullOrWhiteSpace(dto.Label))
                return BadRequest(new { success = false, message = "Path and Label are required." });

            // Prevent duplicates
            bool exists = await _context.userfavourites
                .AnyAsync(f => f.UserId == userId && f.Path == dto.Path);
            if (exists)
                return BadRequest(new { success = false, message = "This screen is already in your favourites." });

            var maxOrder = await _context.userfavourites
                .Where(f => f.UserId == userId)
                .Select(f => (int?)f.SortOrder)
                .MaxAsync() ?? -1;

            var fav = new UserFavourite
            {
                UserId = userId,
                Path = dto.Path,
                Label = dto.Label,
                Category = dto.Category,
                SortOrder = maxOrder + 1,
                CreatedAt = DateTime.Now
            };

            _context.userfavourites.Add(fav);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Added to favourites.", data = new FavouriteResponseDTO
            {
                Id = fav.Id,
                Path = fav.Path,
                Label = fav.Label,
                Category = fav.Category,
                SortOrder = fav.SortOrder
            }});
        }

        // DELETE api/Favourites/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> RemoveFavourite(int id)
        {
            var userId = GetUserId();
            if (userId <= 0) return Unauthorized();

            var fav = await _context.userfavourites
                .FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
            if (fav == null)
                return NotFound(new { success = false, message = "Favourite not found." });

            _context.userfavourites.Remove(fav);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Removed from favourites." });
        }
    }
}
