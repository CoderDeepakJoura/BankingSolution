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
        public async Task<IActionResult> CreateZone([FromBody] ZoneMasterDTO zoneMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Login attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                var existingZone = await _appContext.zone
               .Where(z =>
                   z.zonecode == zoneMasterDTO.ZoneCode ||
                   z.zonename == zoneMasterDTO.ZoneName ||
                   z.zonenamesl == zoneMasterDTO.ZoneNameSL)
               .FirstOrDefaultAsync();

                var errors = new List<string>();

                // Check if Zone Code exists
                bool zoneCodeExists = await _appContext.zone
                    .AnyAsync(z => z.zonecode == zoneMasterDTO.ZoneCode);
                if (zoneCodeExists)
                    errors.Add("Zone code already exists.");

                // Check if Zone Name exists
                bool zoneNameExists = await _appContext.zone
                    .AnyAsync(z => z.zonename == zoneMasterDTO.ZoneName);
                if (zoneNameExists)
                    errors.Add("Zone Name already exists.");

                // Check if Zone Name SL exists (only if not null/empty)
                if (!string.IsNullOrWhiteSpace(zoneMasterDTO.ZoneNameSL))
                {
                    bool zoneNameSLExists = await _appContext.zone
                        .AnyAsync(z => z.zonenamesl == zoneMasterDTO.ZoneNameSL);
                    if (zoneNameSLExists)
                        errors.Add("Zone Name SL already exists.");
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
        public async Task<IActionResult> GetAllZones([FromBody] ZoneFilterDto filter)
        {
            try
            {
               var zoneinfo = await _appContext.zone.Where(z => string.IsNullOrEmpty(filter.SearchTerm) ||
                                z.zonename.Contains(filter.SearchTerm) ||
                                z.zonecode.Contains(filter.SearchTerm) ||
                                z.zonenamesl.Contains(filter.SearchTerm))
                    .OrderBy(z => z.zonename)
                    .Skip((filter.PageNumber - 1) * filter.PageSize)
                    .Take(filter.PageSize)
                    .ToListAsync();
                var totalCount = await _appContext.zone.CountAsync(z => string.IsNullOrEmpty(filter.SearchTerm) ||
                                                                        z.zonename.Contains(filter.SearchTerm) ||
                                                                        z.zonecode.Contains(filter.SearchTerm) ||
                                                                        z.zonenamesl.Contains(filter.SearchTerm));
                return Ok(new
                {
                    Success = true,
                    Zones = zoneinfo,
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
    }
}
