using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Zone;
using BankingPlatform.Infrastructure.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ThanaController : ControllerBase
    {
        private readonly BankingDbContext _appContext;
        private readonly ILogger<ThanaController> _logger;
        public ThanaController(BankingDbContext appcontext, ILogger<ThanaController> logger)
        {
            _appContext = appcontext;
            _logger = logger;
        }

        [Authorize]
        [HttpPost("create_thana")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> CreateThana([FromBody] ThanaMasterDto thanaMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Create new Thana attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }



                var errors = new List<string>();
                bool anyExists = await _appContext.thana
                    .AnyAsync(z =>
                        (z.thanacode.ToLower() == thanaMasterDTO.ThanaCode.ToLower() ||
                         z.thananame.ToLower() == thanaMasterDTO.ThanaName.ToLower() ||
                         (z.thananamesl != null && z.thananamesl.ToLower() == thanaMasterDTO.ThanaNameSL.ToLower())));

                if (anyExists)
                {
                    if (await _appContext.thana.AnyAsync(z => z.id != thanaMasterDTO.ThanaId && z.thanacode.ToLower() == thanaMasterDTO.ThanaCode.ToLower()))
                        errors.Add("Thana code already exists.");

                    if (await _appContext.thana.AnyAsync(z => z.id != thanaMasterDTO.ThanaId && z.thananame.ToLower() == thanaMasterDTO.ThanaName.ToLower()))
                        errors.Add("Thana Name already exists.");

                    if (!string.IsNullOrWhiteSpace(thanaMasterDTO.ThanaNameSL) &&
                        await _appContext.thana.AnyAsync(z => z.id != thanaMasterDTO.ThanaId && z.thananamesl !=null && z.thananamesl.ToLower() == thanaMasterDTO.ThanaNameSL.ToLower()))
                    {
                        errors.Add("Thana Name SL already exists.");
                    }
                }

                if (errors.Any())
                {
                    _logger.LogWarning("Thana update failed due to duplicate data: {Errors}", string.Join(", ", errors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join("\n", errors)
                    });
                }

                // Return all errors if any
                if (errors.Any())
                {
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join("\n", errors)
                    });
                }
                thanaMasterDTO.ThanaCode = thanaMasterDTO.ThanaCode?.Trim() ?? "";
                thanaMasterDTO.ThanaName = thanaMasterDTO.ThanaName?.Trim() ?? "";
                thanaMasterDTO.ThanaNameSL = thanaMasterDTO.ThanaNameSL?.Trim() ?? "";


                await _appContext.thana.AddAsync(new Thana
                {
                    branchid = 1,
                    thananame = thanaMasterDTO.ThanaName,
                    thananamesl = thanaMasterDTO.ThanaNameSL,
                    thanacode = thanaMasterDTO.ThanaCode
                });
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Thana saved successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating Thana : {ThanaName}, ThanaCode: {ThanaCode}, ThanaNameSL : {ThanaNameSL}",
                       thanaMasterDTO?.ThanaName ?? "unknown", thanaMasterDTO?.ThanaCode ?? "unknown", thanaMasterDTO?.ThanaNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }

        [HttpPost("get_all_thanas")]
        [Authorize]
        public async Task<IActionResult> GetAllThanas([FromBody] ZoneFilterDto filter)
        {
            try
            {
                var query = _appContext.thana.AsNoTracking();

                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var term = filter.SearchTerm;
                    query = query.Where(z =>
                        z.thananame.Contains(term) ||
                        z.thanacode.Contains(term) ||
                        z.thananamesl != null && z.thananamesl.Contains(term));
                }
                var totalCount = await query.CountAsync();

                var items = await query
                    .OrderBy(z => z.thananame)
                    .Skip((filter.PageNumber - 1) * filter.PageSize)
                    .Take(filter.PageSize)
                    .Select(z => new ThanaMasterDto(z.thananame, z.thanacode, z.thananamesl, z.id))
                    .ToListAsync();

                return Ok(new
                {
                    Success = true,
                    Thanas = items,
                    TotalCount = totalCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching Thanas");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "Unexpected error while fetching Thanas"
                });
            }
        }

        [Authorize]
        [HttpPost("modify_thana")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> ModifyThana([FromBody] ThanaMasterDto thanaMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Modify Thana attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the thana to be modified exists
                var existingThana = await _appContext.thana.FindAsync(thanaMasterDTO.ThanaId, 1);
                if (existingThana == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Thana not found."
                    });
                }

                // Check for duplicates, excluding the current thana being modified
                var errors = new List<string>();
                bool anyExists = await _appContext.thana
                    .AnyAsync(z => z.id != thanaMasterDTO.ThanaId &&
                        (z.thanacode.ToLower() == thanaMasterDTO.ThanaCode.ToLower() ||
                         z.thananame.ToLower() == thanaMasterDTO.ThanaName.ToLower() ||
                         (z.thananamesl != null && z.thananamesl.ToLower() == thanaMasterDTO.ThanaNameSL.ToLower())));

                if (anyExists)
                {
                    if (await _appContext.thana.AnyAsync(z => z.id != thanaMasterDTO.ThanaId && z.thanacode.ToLower() == thanaMasterDTO.ThanaCode.ToLower()))
                        errors.Add("Thana code already exists.");

                    if (await _appContext.thana.AnyAsync(z => z.id != thanaMasterDTO.ThanaId && z.thananame.ToLower() == thanaMasterDTO.ThanaName.ToLower()))
                        errors.Add("Thana Name already exists.");

                    if (!string.IsNullOrWhiteSpace(thanaMasterDTO.ThanaNameSL) &&
                        await _appContext.thana.AnyAsync(z => z.id != thanaMasterDTO.ThanaId && (z.thananamesl != null && z.thananamesl.ToLower() == thanaMasterDTO.ThanaNameSL.ToLower())))
                    {
                        errors.Add("Thana Name SL already exists.");
                    }
                }

                if (errors.Any())
                {
                    _logger.LogWarning("Thana update failed due to duplicate data: {Errors}", string.Join(", ", errors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join("\n", errors)
                    });
                }

                // Update the properties of the existing thana entity
                existingThana.thanacode = thanaMasterDTO.ThanaCode?.Trim() ?? "";
                existingThana.thananame = thanaMasterDTO.ThanaName?.Trim() ?? "";
                existingThana.thananamesl = thanaMasterDTO.ThanaNameSL?.Trim() ?? "";

                // Save changes to the database
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Thana updated successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating Thana : {ThanaName}, ThanaCode: {ThanaCode}, ThanaNameSL : {ThanaNameSL}",
                       thanaMasterDTO?.ThanaName ?? "unknown", thanaMasterDTO?.ThanaCode ?? "unknown", thanaMasterDTO?.ThanaNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }


        [Authorize]
        [HttpPost("delete_thana")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> DeleteThana([FromBody] ThanaMasterDto thanaMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Delete Thana attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the thana to be deleted exists
                var existingThana = await _appContext.thana.FindAsync(thanaMasterDTO.ThanaId, 1);
                if (existingThana == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Thana not found."
                    });
                }

                _appContext.thana.Remove(existingThana);
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Thana deleted successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while deleting Thana : {ThanaName}, ThanaCode: {ThanaCode}, ThanaNameSL : {ThanaNameSL}",
                       thanaMasterDTO?.ThanaName ?? "unknown", thanaMasterDTO?.ThanaCode ?? "unknown", thanaMasterDTO?.ThanaNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }
    }
}
