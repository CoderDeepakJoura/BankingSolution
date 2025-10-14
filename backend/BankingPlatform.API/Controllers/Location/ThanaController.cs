using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Location;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Controllers.Location
{
    [Route("api/[controller]")]
    [ApiController]
    public class ThanaController : ControllerBase
    {
        private readonly BankingDbContext _appContext;
        private readonly ILogger<ThanaController> _logger;
        private readonly CommonFunctions _commonFunctions;
        public ThanaController(BankingDbContext appcontext, ILogger<ThanaController> logger, CommonFunctions commonFunctions)
        {
            _appContext = appcontext;
            _logger = logger;
            _commonFunctions = commonFunctions;
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

                string inputCode = thanaMasterDTO.ThanaCode.Trim().ToLower();
                string inputName = thanaMasterDTO.ThanaName.Trim().ToLower();
                string? inputNameSL = thanaMasterDTO.ThanaNameSL?.Trim().ToLower();

                var errors = new List<string>();

                var duplicateThanas = await _appContext.thana
                    .Where(z => z.branchid == thanaMasterDTO.BranchId &&
                                (z.thanacode.ToLower() == inputCode ||
                                 z.thananame.ToLower() == inputName ||
                                 !string.IsNullOrEmpty(inputNameSL) && z.thananamesl != null && z.thananamesl.ToLower() == inputNameSL))
                    .ToListAsync();

                if (duplicateThanas.Any(z => z.thanacode.ToLower() == inputCode))
                    errors.Add("Thana Code already exists.");

                if (duplicateThanas.Any(z => z.thananame.ToLower() == inputName))
                    errors.Add("Thana Name already exists.");

                if (!string.IsNullOrEmpty(inputNameSL) &&
                    duplicateThanas.Any(z => z.thananamesl != null && z.thananamesl.ToLower() == inputNameSL))
                {
                    errors.Add("Thana Name SL already exists.");
                }

                if (errors.Any())
                {
                    _logger.LogWarning(
                        "Thana update failed for ThanaId {ThanaId}. Errors: {Errors}",
                        thanaMasterDTO.ThanaId,
                        string.Join(", ", errors));

                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join(Environment.NewLine, errors)
                    });
                }

                thanaMasterDTO.ThanaCode = thanaMasterDTO.ThanaCode?.Trim() ?? "";
                thanaMasterDTO.ThanaName = thanaMasterDTO.ThanaName?.Trim() ?? "";
                thanaMasterDTO.ThanaNameSL = thanaMasterDTO.ThanaNameSL?.Trim() ?? "";


                await _appContext.thana.AddAsync(new Thana
                {
                    branchid = thanaMasterDTO.BranchId,
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
                await _commonFunctions.LogErrors(ex, nameof(CreateThana), "ThanaController");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }

        [HttpPost("get_all_thanas/{branchid}")]
        [Authorize]
        public async Task<IActionResult> GetAllThanas([FromRoute] int branchid, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var query = _appContext.thana.AsNoTracking();

                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var term = filter.SearchTerm;
                    query = query.Where(z =>
                        z.thananame.ToLower().Contains(term.ToLower()) ||
                        z.thanacode.ToLower().Contains(term.ToLower()) ||
                        z.thananamesl != null && z.thananamesl.ToLower().Contains(term.ToLower()));
                }
                var totalCount = await query.CountAsync();

                var items = await query
                    .Where(x=> x.branchid == branchid)
                    .OrderBy(z => z.thananame)
                    .Skip((filter.PageNumber - 1) * filter.PageSize)
                    .Take(filter.PageSize)
                    .Select(z => new ThanaMasterDto(z.thananame, z.thanacode, z.thananamesl, z.id, z.branchid))
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
                await _commonFunctions.LogErrors(ex, nameof(GetAllThanas), "ThanaController");
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
                var existingThana = await _appContext.thana.FindAsync(thanaMasterDTO.ThanaId, thanaMasterDTO.BranchId);
                if (existingThana == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Thana not found."
                    });
                }

                string inputCode = thanaMasterDTO.ThanaCode.Trim().ToLower();
                string inputName = thanaMasterDTO.ThanaName.Trim().ToLower();
                string? inputNameSL = thanaMasterDTO.ThanaNameSL?.Trim().ToLower();

                var errors = new List<string>();

                var duplicateThanas = await _appContext.thana
                    .Where(z => z.id != thanaMasterDTO.ThanaId && z.branchid == thanaMasterDTO.BranchId
                                &&
                                (z.thanacode.ToLower() == inputCode ||
                                 z.thananame.ToLower() == inputName ||
                                 !string.IsNullOrEmpty(inputNameSL) && z.thananamesl != null && z.thananamesl.ToLower() == inputNameSL))
                    .ToListAsync();

                if (duplicateThanas.Any(z => z.thanacode.ToLower() == inputCode))
                    errors.Add("Thana Code already exists.");

                if (duplicateThanas.Any(z => z.thananame.ToLower() == inputName))
                    errors.Add("Thana Name already exists.");

                if (!string.IsNullOrEmpty(inputNameSL) &&
                    duplicateThanas.Any(z => z.thananamesl != null && z.thananamesl.ToLower() == inputNameSL))
                {
                    errors.Add("Thana Name SL already exists.");
                }

                if (errors.Any())
                {
                    _logger.LogWarning(
                        "Thana update failed for ThanaId {ThanaId}. Errors: {Errors}",
                        thanaMasterDTO.ThanaId,
                        string.Join(", ", errors));

                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join(Environment.NewLine, errors)
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
                await _commonFunctions.LogErrors(ex, nameof(ModifyThana), "ThanaController");
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
                var existingThana = await _appContext.thana.FindAsync(thanaMasterDTO.ThanaId, thanaMasterDTO.BranchId);
                if (existingThana == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Thana not found."
                    });
                }
                if (await _commonFunctions.CheckIfLocationDataInUse(thanaMasterDTO.BranchId, 0, thanaMasterDTO.ThanaId))
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Thana is in use and cannot be deleted."
                    });
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
                await _commonFunctions.LogErrors(ex, nameof(DeleteThana), "ThanaController");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }
    }
}
