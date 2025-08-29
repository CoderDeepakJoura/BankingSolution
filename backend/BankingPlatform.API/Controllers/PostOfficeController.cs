using BankingPlatform.API.DTO.PostOffice;
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



                var errors = new List<string>();
                bool anyExists = await _appContext.postoffice
                    .AnyAsync(z =>
                        (z.postofficecode.ToLower() == postOfficeMasterDTO.PostOfficeCode.ToLower() ||
                         z.postofficename.ToLower() == postOfficeMasterDTO.PostOfficeName.ToLower() ||
                         (z.postofficenamesl != null && z.postofficenamesl.ToLower() == postOfficeMasterDTO.PostOfficeNameSL.ToLower())));

                if (anyExists)
                {
                    if (await _appContext.postoffice.AnyAsync(z => z.id != postOfficeMasterDTO.PostOfficeId && z.postofficecode.ToLower() == postOfficeMasterDTO.PostOfficeCode.ToLower()))
                        errors.Add("PostOffice code already exists.");

                    if (await _appContext.postoffice.AnyAsync(z => z.id != postOfficeMasterDTO.PostOfficeId && z.postofficename.ToLower() == postOfficeMasterDTO.PostOfficeName.ToLower()))
                        errors.Add("PostOffice Name already exists.");

                    if (!string.IsNullOrWhiteSpace(postOfficeMasterDTO.PostOfficeNameSL) &&
                        await _appContext.postoffice.AnyAsync(z => z.id != postOfficeMasterDTO.PostOfficeId && z.postofficenamesl != null && z.postofficenamesl.ToLower() == postOfficeMasterDTO.PostOfficeNameSL.ToLower()))
                    {
                        errors.Add("PostOffice Name SL already exists.");
                    }
                }

                if (errors.Any())
                {
                    _logger.LogWarning("PostOffice update failed due to duplicate data: {Errors}", string.Join(", ", errors));
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
                postOfficeMasterDTO.PostOfficeCode = postOfficeMasterDTO.PostOfficeCode?.Trim() ?? "";
                postOfficeMasterDTO.PostOfficeName = postOfficeMasterDTO.PostOfficeName?.Trim() ?? "";
                postOfficeMasterDTO.PostOfficeNameSL = postOfficeMasterDTO.PostOfficeNameSL?.Trim() ?? "";


                await _appContext.postoffice.AddAsync(new PostOffice
                {
                    branchid = 1,
                    postofficename = postOfficeMasterDTO.PostOfficeName,
                    postofficenamesl = postOfficeMasterDTO.PostOfficeNameSL,
                    postofficecode = postOfficeMasterDTO.PostOfficeCode
                });
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "PostOffice saved successfully"
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

        [HttpPost("get_all_postOffices")]
        [Authorize]
        public async Task<IActionResult> GetAllPostOffices([FromBody] ZoneFilterDto filter)
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
                    .OrderBy(z => z.postofficename)
                    .Skip((filter.PageNumber - 1) * filter.PageSize)
                    .Take(filter.PageSize)
                    .Select(z => new PostOfficeMasterDTO(z.postofficename, z.postofficecode, z.postofficenamesl, z.id))
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
                    _logger.LogWarning("Modify PostOffice attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the postOffice to be modified exists
                var existingPostOffice = await _appContext.postoffice.FindAsync(postOfficeMasterDTO.PostOfficeId, 1);
                if (existingPostOffice == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "PostOffice not found."
                    });
                }

                // Check for duplicates, excluding the current postOffice being modified
                var errors = new List<string>();
                bool anyExists = await _appContext.postoffice
                    .AnyAsync(z => z.id != postOfficeMasterDTO.PostOfficeId &&
                        (z.postofficecode.ToLower() == postOfficeMasterDTO.PostOfficeCode.ToLower() ||
                         z.postofficename.ToLower() == postOfficeMasterDTO.PostOfficeName.ToLower() ||
                         (z.postofficenamesl != null && z.postofficenamesl.ToLower() == postOfficeMasterDTO.PostOfficeNameSL.ToLower())));

                if (anyExists)
                {
                    if (await _appContext.postoffice.AnyAsync(z => z.id != postOfficeMasterDTO.PostOfficeId && z.postofficecode.ToLower() == postOfficeMasterDTO.PostOfficeCode.ToLower()))
                        errors.Add("PostOffice code already exists.");

                    if (await _appContext.postoffice.AnyAsync(z => z.id != postOfficeMasterDTO.PostOfficeId && z.postofficename.ToLower() == postOfficeMasterDTO.PostOfficeName.ToLower()))
                        errors.Add("PostOffice Name already exists.");

                    if (!string.IsNullOrWhiteSpace(postOfficeMasterDTO.PostOfficeNameSL) &&
                        await _appContext.postoffice.AnyAsync(z => z.id != postOfficeMasterDTO.PostOfficeId && (z.postofficenamesl != null && z.postofficenamesl.ToLower() == postOfficeMasterDTO.PostOfficeNameSL.ToLower())))
                    {
                        errors.Add("PostOffice Name SL already exists.");
                    }
                }

                if (errors.Any())
                {
                    _logger.LogWarning("PostOffice update failed due to duplicate data: {Errors}", string.Join(", ", errors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join("\n", errors)
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
                    Message = "PostOffice updated successfully."
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
                var existingPostOffice = await _appContext.postoffice.FindAsync(postOfficeMasterDTO.PostOfficeId, 1);
                if (existingPostOffice == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "PostOffice not found."
                    });
                }

                _appContext.postoffice.Remove(existingPostOffice);
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "PostOffice deleted successfully."
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
