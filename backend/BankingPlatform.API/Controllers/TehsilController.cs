using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Location.Tehsil;
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
    public class TehsilController : ControllerBase
    {
        private readonly BankingDbContext _appContext;
        private readonly ILogger<TehsilController> _logger;
        public TehsilController(BankingDbContext appcontext, ILogger<TehsilController> logger)
        {
            _appContext = appcontext;
            _logger = logger;
        }

        [Authorize]
        [HttpPost("create_tehsil")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> CreateTehsil([FromBody] TehsilMasterDTO tehsilMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Create new Tehsil attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                string inputCode = tehsilMasterDTO.TehsilCode.Trim().ToLower();
                string inputName = tehsilMasterDTO.TehsilName.Trim().ToLower();
                string? inputNameSL = tehsilMasterDTO.TehsilNameSL?.Trim().ToLower();

                var errors = new List<string>();
                var duplicateTehsils = await _appContext.tehsil
                    .Where(z => z.branchid == tehsilMasterDTO.BranchId &&
                                (z.tehsilcode.ToLower() == inputCode ||
                                 z.tehsilname.ToLower() == inputName ||
                                 (!string.IsNullOrEmpty(inputNameSL) && z.tehsilnamesl != null && z.tehsilnamesl.ToLower() == inputNameSL)))
                    .ToListAsync();

                if (duplicateTehsils.Any(z => z.tehsilcode.ToLower() == inputCode))
                    errors.Add("Tehsil Code already exists.");

                if (duplicateTehsils.Any(z => z.tehsilname.ToLower() == inputName))
                    errors.Add("Tehsil Name already exists.");

                if (!string.IsNullOrEmpty(inputNameSL) &&
                    duplicateTehsils.Any(z => z.tehsilnamesl != null && z.tehsilnamesl.ToLower() == inputNameSL))
                {
                    errors.Add("Tehsil Name SL already exists.");
                }

                if (errors.Any())
                {
                    _logger.LogWarning(
                        "Tehsil update failed for TehsilId {TehsilId}. Errors: {Errors}",
                        tehsilMasterDTO.TehsilId,
                        string.Join(", ", errors));

                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join(Environment.NewLine, errors)
                    });
                }

                tehsilMasterDTO.TehsilCode = tehsilMasterDTO.TehsilCode?.Trim() ?? "";
                tehsilMasterDTO.TehsilName = tehsilMasterDTO.TehsilName?.Trim() ?? "";
                tehsilMasterDTO.TehsilNameSL = tehsilMasterDTO.TehsilNameSL?.Trim() ?? "";


                await _appContext.tehsil.AddAsync(new Tehsil
                {
                    branchid = tehsilMasterDTO.BranchId,
                    tehsilname = tehsilMasterDTO.TehsilName,
                    tehsilnamesl = tehsilMasterDTO.TehsilNameSL,
                    tehsilcode = tehsilMasterDTO.TehsilCode
                });
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Tehsil saved successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating Tehsil : {TehsilName}, TehsilCode: {TehsilCode}, TehsilNameSL : {TehsilNameSL}",
                       tehsilMasterDTO?.TehsilName ?? "unknown", tehsilMasterDTO?.TehsilCode ?? "unknown", tehsilMasterDTO?.TehsilNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }

        [HttpPost("get_all_tehsils/{branchId}")]
        [Authorize]
        public async Task<IActionResult> GetAllTehsils([FromRoute] int branchId, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var query = _appContext.tehsil.AsNoTracking();

                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var term = filter.SearchTerm;
                    query = query.Where(z =>
                        z.tehsilname.Contains(term) ||
                        z.tehsilcode.Contains(term) ||
                        z.tehsilnamesl != null && z.tehsilnamesl.Contains(term));
                }
                var totalCount = await query.CountAsync();

                var items = await query
                    .Where(x=> x.branchid == branchId)
                    .OrderBy(z => z.tehsilname)
                    .Skip((filter.PageNumber - 1) * filter.PageSize)
                    .Take(filter.PageSize)
                    .Select(z => new TehsilMasterDTO(z.tehsilname, z.tehsilcode, z.tehsilnamesl, z.id, z.branchid))
                    .ToListAsync();

                return Ok(new
                {
                    Success = true,
                    Tehsils = items,
                    TotalCount = totalCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching Tehsils");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "Unexpected error while fetching Tehsils"
                });
            }
        }

        [Authorize]
        [HttpPost("modify_tehsil")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> ModifyTehsil([FromBody] TehsilMasterDTO tehsilMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Modify Tehsil attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                var existingTehsil = await _appContext.tehsil.FindAsync(tehsilMasterDTO.TehsilId, tehsilMasterDTO.BranchId);
                if (existingTehsil == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Tehsil not found."
                    });
                }

                string inputCode = tehsilMasterDTO.TehsilCode.Trim().ToLower();
                string inputName = tehsilMasterDTO.TehsilName.Trim().ToLower();
                string? inputNameSL = tehsilMasterDTO.TehsilNameSL?.Trim().ToLower();

                var errors = new List<string>();
                var duplicateTehsils = await _appContext.tehsil
                    .Where(z => z.id != tehsilMasterDTO.TehsilId 
                                && z.branchid == tehsilMasterDTO.BranchId &&
                                (z.tehsilcode.ToLower() == inputCode ||
                                 z.tehsilname.ToLower() == inputName ||
                                 (!string.IsNullOrEmpty(inputNameSL) && z.tehsilnamesl != null && z.tehsilnamesl.ToLower() == inputNameSL)))
                    .ToListAsync();

                if (duplicateTehsils.Any(z => z.tehsilcode.ToLower() == inputCode))
                    errors.Add("Tehsil Code already exists.");

                if (duplicateTehsils.Any(z => z.tehsilname.ToLower() == inputName))
                    errors.Add("Tehsil Name already exists.");

                if (!string.IsNullOrEmpty(inputNameSL) &&
                    duplicateTehsils.Any(z => z.tehsilnamesl != null && z.tehsilnamesl.ToLower() == inputNameSL))
                {
                    errors.Add("Tehsil Name SL already exists.");
                }

                if (errors.Any())
                {
                    _logger.LogWarning(
                        "Tehsil update failed for TehsilId {TehsilId}. Errors: {Errors}",
                        tehsilMasterDTO.TehsilId,
                        string.Join(", ", errors));

                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join(Environment.NewLine, errors)
                    });
                }

                existingTehsil.tehsilcode = tehsilMasterDTO.TehsilCode?.Trim() ?? "";
                existingTehsil.tehsilname = tehsilMasterDTO.TehsilName?.Trim() ?? "";
                existingTehsil.tehsilnamesl = tehsilMasterDTO.TehsilNameSL?.Trim() ?? "";

                // Save changes to the database
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Tehsil updated successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating Tehsil : {TehsilName}, TehsilCode: {TehsilCode}, TehsilNameSL : {TehsilNameSL}",
                       tehsilMasterDTO?.TehsilName ?? "unknown", tehsilMasterDTO?.TehsilCode ?? "unknown", tehsilMasterDTO?.TehsilNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }


        [Authorize]
        [HttpPost("delete_tehsil")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> DeleteTehsil([FromBody] TehsilMasterDTO tehsilMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Delete Tehsil attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the tehsil to be deleted exists
                var existingTehsil = await _appContext.tehsil.FindAsync(tehsilMasterDTO.TehsilId, tehsilMasterDTO.BranchId);
                if (existingTehsil == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Tehsil not found."
                    });
                }

                _appContext.tehsil.Remove(existingTehsil);
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Tehsil deleted successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while deleting Tehsil : {TehsilName}, TehsilCode: {TehsilCode}, TehsilNameSL : {TehsilNameSL}",
                       tehsilMasterDTO?.TehsilName ?? "unknown", tehsilMasterDTO?.TehsilCode ?? "unknown", tehsilMasterDTO?.TehsilNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }
    }

}
