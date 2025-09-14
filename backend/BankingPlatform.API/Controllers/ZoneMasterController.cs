using BankingPlatform.API.DTO;
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
    public class ZoneMasterController : ControllerBase
    {
        private readonly BankingDbContext _appContext;
        private readonly ILogger<ZoneMasterController> _logger;
        public ZoneMasterController(BankingDbContext appcontext, ILogger<ZoneMasterController> logger)
        {
            _appContext = appcontext;
            _logger = logger;
        }

        [Authorize]
        [HttpPost("create_zone")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> CreateZone([FromBody] ZoneMasterDto zoneMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Create new Zone attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

               

                var errors = new List<string>();
                bool anyExists = await _appContext.zone
                    .AnyAsync(z => 
                        (z.zonecode.ToLower() == zoneMasterDTO.ZoneCode.ToLower() ||
                         z.zonename.ToLower() == zoneMasterDTO.ZoneName.ToLower() ||
                         (z.zonenamesl != null && z.zonenamesl.ToLower() == zoneMasterDTO.ZoneNameSL.ToLower())));

                if (anyExists)
                {
                    if (await _appContext.zone.AnyAsync(z => z.id != zoneMasterDTO.ZoneId && z.zonecode == zoneMasterDTO.ZoneCode.ToLower()))
                        errors.Add("Zone code already exists.");

                    if (await _appContext.zone.AnyAsync(z => z.id != zoneMasterDTO.ZoneId && z.zonename == zoneMasterDTO.ZoneName.ToLower()))
                        errors.Add("Zone Name already exists.");

                    if (!string.IsNullOrWhiteSpace(zoneMasterDTO.ZoneNameSL) &&
                        await _appContext.zone.AnyAsync(z => z.id != zoneMasterDTO.ZoneId && (z.zonenamesl != null && z.zonenamesl.ToLower() == zoneMasterDTO.ZoneNameSL.ToLower())))
                    {
                        errors.Add("Zone Name SL already exists.");
                    }
                }

                if (errors.Any())
                {
                    _logger.LogWarning("Zone update failed due to duplicate data: {Errors}", string.Join(", ", errors));
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
                zoneMasterDTO.ZoneCode = zoneMasterDTO.ZoneCode?.Trim() ?? "";
                zoneMasterDTO.ZoneName = zoneMasterDTO.ZoneName?.Trim() ?? "";
                zoneMasterDTO.ZoneNameSL = zoneMasterDTO.ZoneNameSL?.Trim() ?? "";


                await _appContext.zone.AddAsync(new Zone
                {
                    branchid = 1,
                    zonename = zoneMasterDTO.ZoneName,
                    zonenamesl = zoneMasterDTO.ZoneNameSL,
                    zonecode = zoneMasterDTO.ZoneCode
                });
                await _appContext.SaveChangesAsync();
                
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Zone saved successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating Zone : {ZoneName}, ZoneCode: {ZoneCode}, ZoneNameSL : {ZoneNameSL}",
                       zoneMasterDTO?.ZoneName ?? "unknown", zoneMasterDTO?.ZoneCode ?? "unknown", zoneMasterDTO?.ZoneNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }

        [HttpPost("get_all_zones")]
        [Authorize]
        public async Task<IActionResult> GetAllZones([FromBody] LocationFilterDTO filter)
        {
            try
            {
                var query = _appContext.zone.AsNoTracking(); 

                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var term = filter.SearchTerm;
                    query = query.Where(z =>
                        z.zonename.Contains(term) ||
                        z.zonecode.Contains(term) ||
                        z.zonenamesl != null && z.zonenamesl.Contains(term));
                }
                var totalCount = await query.CountAsync();

                var items = await query
                    .OrderBy(z => z.zonename)
                    .Skip((filter.PageNumber - 1) * filter.PageSize)
                    .Take(filter.PageSize)
                    .Select(z => new ZoneMasterDto(z.zonename, z.zonecode, z.zonenamesl, z.id))
                    .ToListAsync();
               
                return Ok(new
                {
                    Success = true,
                    Zones = items,
                    TotalCount = totalCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching Zones");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "Unexpected error while fetching Zones"
                });
            }
        }

        [Authorize]
        [HttpPost("modify_zone")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> ModifyZone([FromBody] ZoneMasterDto zoneMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Modify Zone attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the zone to be modified exists
                var existingZone = await _appContext.zone.FindAsync(zoneMasterDTO.ZoneId, 1);
                if (existingZone == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Zone not found."
                    });
                }

                // Check for duplicates, excluding the current zone being modified
                var errors = new List<string>();
                bool anyExists = await _appContext.zone
                    .AnyAsync(z => z.id != zoneMasterDTO.ZoneId &&
                        (z.zonecode.ToLower() == zoneMasterDTO.ZoneCode.ToLower() ||
                         z.zonename.ToLower() == zoneMasterDTO.ZoneName.ToLower() ||
                         (z.zonenamesl != null && z.zonenamesl.ToLower() == zoneMasterDTO.ZoneNameSL.ToLower())));

                if (anyExists)
                {
                    if (await _appContext.zone.AnyAsync(z => z.id != zoneMasterDTO.ZoneId && z.zonecode.ToLower() == zoneMasterDTO.ZoneCode.ToLower()))
                        errors.Add("Zone code already exists.");

                    if (await _appContext.zone.AnyAsync(z => z.id != zoneMasterDTO.ZoneId && z.zonename.ToLower() == zoneMasterDTO.ZoneName.ToLower()))
                        errors.Add("Zone Name already exists.");

                    if (!string.IsNullOrWhiteSpace(zoneMasterDTO.ZoneNameSL) &&
                        await _appContext.zone.AnyAsync(z => z.id != zoneMasterDTO.ZoneId && (z.zonenamesl != null && z.zonenamesl.ToLower() == zoneMasterDTO.ZoneNameSL.ToLower())))
                    {
                        errors.Add("Zone Name SL already exists.");
                    }
                }

                if (errors.Any())
                {
                    _logger.LogWarning("Zone update failed due to duplicate data: {Errors}", string.Join(", ", errors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join("\n", errors)
                    });
                }

                // Update the properties of the existing zone entity
                existingZone.zonecode = zoneMasterDTO.ZoneCode?.Trim() ?? "";
                existingZone.zonename = zoneMasterDTO.ZoneName?.Trim() ?? "";
                existingZone.zonenamesl = zoneMasterDTO.ZoneNameSL?.Trim() ?? "";

                // Save changes to the database
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Zone updated successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating Zone : {ZoneName}, ZoneCode: {ZoneCode}, ZoneNameSL : {ZoneNameSL}",
                       zoneMasterDTO?.ZoneName ?? "unknown", zoneMasterDTO?.ZoneCode ?? "unknown", zoneMasterDTO?.ZoneNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }


        [Authorize]
        [HttpPost("delete_zone")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> DeleteZone([FromBody] ZoneMasterDto zoneMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Delete Zone attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the zone to be deleted exists
                var existingZone = await _appContext.zone.FindAsync(zoneMasterDTO.ZoneId, 1);
                if (existingZone == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Zone not found."
                    });
                }

                _appContext.zone.Remove(existingZone);
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Zone deleted successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while deleting Zone : {ZoneName}, ZoneCode: {ZoneCode}, ZoneNameSL : {ZoneNameSL}",
                       zoneMasterDTO?.ZoneName ?? "unknown", zoneMasterDTO?.ZoneCode ?? "unknown", zoneMasterDTO?.ZoneNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }

    }
}
