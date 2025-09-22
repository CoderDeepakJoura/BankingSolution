using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Location.PostOffice;
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
    public class PostOfficeController : ControllerBase
    {
        private readonly BankingDbContext _appContext;
        private readonly ILogger<PostOfficeController> _logger;
        public PostOfficeController(BankingDbContext appcontext, ILogger<PostOfficeController> logger)
        {
            _appContext = appcontext;
            _logger = logger;
        }

        [Authorize]
        [HttpPost("create_postOffice")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> CreatePostOffice([FromBody] PostOfficeMasterDTO postOfficeMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Create new PostOffice attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Normalize inputs
                string inputCode = postOfficeMasterDTO.PostOfficeCode.Trim().ToLower();
                string inputName = postOfficeMasterDTO.PostOfficeName.Trim().ToLower();
                string? inputNameSL = postOfficeMasterDTO.PostOfficeNameSL?.Trim().ToLower();

                var errors = new List<string>();

                // Single DB hit instead of multiple AnyAsync calls
                var duplicatePostOffices = await _appContext.postoffice
                    .Where(z => z.branchid == postOfficeMasterDTO.BranchId &&
                                (z.postofficecode.ToLower() == inputCode ||
                                 z.postofficename.ToLower() == inputName ||
                                 (!string.IsNullOrEmpty(inputNameSL) && z.postofficenamesl != null && z.postofficenamesl.ToLower() == inputNameSL)))
                    .ToListAsync();

                if (duplicatePostOffices.Any(z => z.postofficecode.ToLower() == inputCode))
                    errors.Add("Post Office Code already exists.");

                if (duplicatePostOffices.Any(z => z.postofficename.ToLower() == inputName))
                    errors.Add("Post Office Name already exists.");

                if (!string.IsNullOrEmpty(inputNameSL) &&
                    duplicatePostOffices.Any(z => z.postofficenamesl != null && z.postofficenamesl.ToLower() == inputNameSL))
                {
                    errors.Add("Post Office Name SL already exists.");
                }

                if (errors.Any())
                {
                    _logger.LogWarning(
                        "Post Office update failed for PostOfficeId {PostOfficeId}. Errors: {Errors}",
                        postOfficeMasterDTO.PostOfficeId,
                        string.Join(", ", errors));

                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join(Environment.NewLine, errors)
                    });
                }

                postOfficeMasterDTO.PostOfficeCode = postOfficeMasterDTO.PostOfficeCode?.Trim() ?? "";
                postOfficeMasterDTO.PostOfficeName = postOfficeMasterDTO.PostOfficeName?.Trim() ?? "";
                postOfficeMasterDTO.PostOfficeNameSL = postOfficeMasterDTO.PostOfficeNameSL?.Trim() ?? "";


                await _appContext.postoffice.AddAsync(new PostOffice
                {
                    branchid = postOfficeMasterDTO.BranchId,
                    postofficename = postOfficeMasterDTO.PostOfficeName,
                    postofficenamesl = postOfficeMasterDTO.PostOfficeNameSL,
                    postofficecode = postOfficeMasterDTO.PostOfficeCode
                });
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Post Office saved successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating PostOffice : {PostOfficeName}, PostOfficeCode: {PostOfficeCode}, PostOfficeNameSL : {PostOfficeNameSL}",
                       postOfficeMasterDTO?.PostOfficeName ?? "unknown", postOfficeMasterDTO?.PostOfficeCode ?? "unknown", postOfficeMasterDTO?.PostOfficeNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }

        [HttpPost("get_all_postOffices/{branchid}")]
        [Authorize]
        public async Task<IActionResult> GetAllPostOffices([FromRoute] int branchid, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var query = _appContext.postoffice.AsNoTracking();

                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var term = filter.SearchTerm;
                    query = query.Where(z =>
                        z.postofficename.Contains(term) ||
                        z.postofficecode.Contains(term) ||
                        z.postofficenamesl != null && z.postofficenamesl.Contains(term));
                }
                var totalCount = await query.CountAsync();

                var items = await query
                    .Where(x=> x.branchid == branchid)
                    .OrderBy(z => z.postofficename)
                    .Skip((filter.PageNumber - 1) * filter.PageSize)
                    .Take(filter.PageSize)
                    .Select(z => new PostOfficeMasterDTO(z.postofficename, z.postofficecode, z.postofficenamesl, z.id, z.branchid))
                    .ToListAsync();

                return Ok(new
                {
                    Success = true,
                    PostOffices = items,
                    TotalCount = totalCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching PostOffices");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "Unexpected error while fetching PostOffices"
                });
            }
        }

        [Authorize]
        [HttpPost("modify_postOffice")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> ModifyPostOffice([FromBody] PostOfficeMasterDTO postOfficeMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Modify Post Office attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the postOffice to be modified exists
                var existingPostOffice = await _appContext.postoffice.FindAsync(postOfficeMasterDTO.PostOfficeId, postOfficeMasterDTO.BranchId);
                if (existingPostOffice == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Post Office not found."
                    });
                }

                // Normalize inputs
                string inputCode = postOfficeMasterDTO.PostOfficeCode.Trim().ToLower();
                string inputName = postOfficeMasterDTO.PostOfficeName.Trim().ToLower();
                string? inputNameSL = postOfficeMasterDTO.PostOfficeNameSL?.Trim().ToLower();

                var errors = new List<string>();

                // Single DB hit instead of multiple AnyAsync calls
                var duplicatePostOffices = await _appContext.postoffice
                    .Where(z => z.id != postOfficeMasterDTO.PostOfficeId 
                                && z.branchid == postOfficeMasterDTO.BranchId
                                && (z.postofficecode.ToLower() == inputCode ||
                                 z.postofficename.ToLower() == inputName ||
                                 (!string.IsNullOrEmpty(inputNameSL) && z.postofficenamesl != null && z.postofficenamesl.ToLower() == inputNameSL)))
                    .ToListAsync();

                if (duplicatePostOffices.Any(z => z.postofficecode.ToLower() == inputCode))
                    errors.Add("Post Office Code already exists.");

                if (duplicatePostOffices.Any(z => z.postofficename.ToLower() == inputName))
                    errors.Add("Post Office Name already exists.");

                if (!string.IsNullOrEmpty(inputNameSL) &&
                    duplicatePostOffices.Any(z => z.postofficenamesl != null && z.postofficenamesl.ToLower() == inputNameSL))
                {
                    errors.Add("Post Office Name SL already exists.");
                }

                if (errors.Any())
                {
                    _logger.LogWarning(
                        "Post Office update failed for PostOfficeId {PostOfficeId}. Errors: {Errors}",
                        postOfficeMasterDTO.PostOfficeId,
                        string.Join(", ", errors));

                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join(Environment.NewLine, errors)
                    });
                }

                // Update the properties of the existing postOffice entity
                existingPostOffice.postofficecode = postOfficeMasterDTO.PostOfficeCode?.Trim() ?? "";
                existingPostOffice.postofficename = postOfficeMasterDTO.PostOfficeName?.Trim() ?? "";
                existingPostOffice.postofficenamesl = postOfficeMasterDTO.PostOfficeNameSL?.Trim() ?? "";

                // Save changes to the database
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Post Office updated successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating PostOffice : {PostOfficeName}, PostOfficeCode: {PostOfficeCode}, PostOfficeNameSL : {PostOfficeNameSL}",
                       postOfficeMasterDTO?.PostOfficeName ?? "unknown", postOfficeMasterDTO?.PostOfficeCode ?? "unknown", postOfficeMasterDTO?.PostOfficeNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }


        [Authorize]
        [HttpPost("delete_postOffice")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> DeletePostOffice([FromBody] PostOfficeMasterDTO postOfficeMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Delete PostOffice attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the postOffice to be deleted exists
                var existingPostOffice = await _appContext.postoffice.FindAsync(postOfficeMasterDTO.PostOfficeId, postOfficeMasterDTO.BranchId);
                if (existingPostOffice == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Post Office not found."
                    });
                }

                _appContext.postoffice.Remove(existingPostOffice);
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Post Office deleted successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while deleting PostOffice : {PostOfficeName}, PostOfficeCode: {PostOfficeCode}, PostOfficeNameSL : {PostOfficeNameSL}",
                       postOfficeMasterDTO?.PostOfficeName ?? "unknown", postOfficeMasterDTO?.PostOfficeCode ?? "unknown", postOfficeMasterDTO?.PostOfficeNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }
    }
}
