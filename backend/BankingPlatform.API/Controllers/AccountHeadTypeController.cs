using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountHead;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountHeadTypeController : ControllerBase
    {
        private readonly BankingDbContext _appContext;
        private readonly ILogger<AccountHeadTypeController> _logger;
        public AccountHeadTypeController(BankingDbContext appcontext, ILogger<AccountHeadTypeController> logger)
        {
            _appContext = appcontext;
            _logger = logger;
        }

        [Authorize]
        [HttpPost("create_accountheadtype")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> CreateAccountHeadType([FromBody] AccountHeadTypeDTO accountheadtypeMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Create new AccountHeadType attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                var errors = new List<string>();

                var normalizedName = accountheadtypeMasterDTO.AccountHeadTypeName?.Trim().ToLower();
                var normalizedNameSL = accountheadtypeMasterDTO.AccountHeadTypeNameSL?.Trim().ToLower();

                var duplicates = await _appContext.accountheadtype
                    .Where(z => z.id == accountheadtypeMasterDTO.BranchId &&
                                (
                                    z.description.ToLower() == normalizedName ||
                                    (normalizedNameSL != null && z.descriptionsl != null && z.descriptionsl.ToLower() == normalizedNameSL)
                                ))
                    .ToListAsync();

                if (duplicates.Any(d => d.description.ToLower() == normalizedName))
                {
                    errors.Add("Account Head Type Name already exists.");
                }

                if (!string.IsNullOrWhiteSpace(normalizedNameSL) &&
                    duplicates.Any(d => d.descriptionsl != null && d.descriptionsl.ToLower() == normalizedNameSL))
                {
                    errors.Add("Account Head Type Name SL already exists.");
                }

                if (errors.Any())
                {
                    _logger.LogWarning("Account Head Type update failed due to duplicate data: {Errors}", string.Join(", ", errors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join("\n", errors)
                    });
                }

                accountheadtypeMasterDTO.AccountHeadTypeName = accountheadtypeMasterDTO.AccountHeadTypeName?.Trim() ?? "";
                accountheadtypeMasterDTO.AccountHeadTypeNameSL = accountheadtypeMasterDTO.AccountHeadTypeNameSL?.Trim() ?? "";


                await _appContext.accountheadtype.AddAsync(new AccountHeadType
                {
                    branchid = accountheadtypeMasterDTO.BranchId,
                    description = accountheadtypeMasterDTO.AccountHeadTypeName,
                    descriptionsl = accountheadtypeMasterDTO.AccountHeadTypeNameSL
                });
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Account Head Type saved successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating AccountHeadType : {AccountHeadTypeName},  AccountHeadTypeNameSL : {AccountHeadTypeNameSL}",
                       accountheadtypeMasterDTO?.AccountHeadTypeName ?? "unknown", accountheadtypeMasterDTO?.AccountHeadTypeNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }

        [HttpPost("get_all_accountheadtype/{branchId}")]
        [EnableRateLimiting("Auth")]
        [Authorize]
        public async Task<IActionResult> GetAllAccountHeadTypes([FromRoute] int branchId, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var query = _appContext.accountheadtype.AsNoTracking();

                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var term = filter.SearchTerm;
                    query = query.Where(z =>
                        z.description.Contains(term) ||
                        z.descriptionsl != null && z.descriptionsl.Contains(term));
                }
                var totalCount = await query.CountAsync();

                var items = await query
                    .Where(x=> x.branchid == branchId)
                    .OrderBy(z => z.description)
                    .Skip((filter.PageNumber - 1) * filter.PageSize)
                    .Take(filter.PageSize)
                    .Select(z => new AccountHeadTypeDTO(z.description, z.descriptionsl, z.id, z.branchid))
                    .ToListAsync();

                return Ok(new
                {
                    Success = true,
                    AccountHeadType = items,
                    TotalCount = totalCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching AccountHeadTypes");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "Unexpected error while fetching AccountHeadTypes"
                });
            }
        }

        [Authorize]
        [HttpPost("modify_accountheadtype")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> ModifyAccountHeadType([FromBody] AccountHeadTypeDTO accountheadtypeMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Modify AccountHeadType attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the accountheadtype to be modified exists
                var existingAccountHeadType = await _appContext.accountheadtype.FindAsync(accountheadtypeMasterDTO.AccountHeadTypeId, accountheadtypeMasterDTO.BranchId);
                if (existingAccountHeadType == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "AccountHeadType not found."
                    });
                }

                var errors = new List<string>();

                var normalizedName = accountheadtypeMasterDTO.AccountHeadTypeName?.Trim().ToLower();
                var normalizedNameSL = accountheadtypeMasterDTO.AccountHeadTypeNameSL?.Trim().ToLower();

                var duplicates = await _appContext.accountheadtype
                    .Where(z => z.id != accountheadtypeMasterDTO.AccountHeadTypeId &&
                                (
                                    z.description.ToLower() == normalizedName ||
                                    (normalizedNameSL != null && z.descriptionsl != null && z.descriptionsl.ToLower() == normalizedNameSL)
                                )
                                && z.branchid == accountheadtypeMasterDTO.BranchId)
                    .ToListAsync();

                if (duplicates.Any(d => d.description.ToLower() == normalizedName))
                {
                    errors.Add("Account Head Type Name already exists.");
                }

                if (!string.IsNullOrWhiteSpace(normalizedNameSL) &&
                    duplicates.Any(d => d.descriptionsl != null && d.descriptionsl.ToLower() == normalizedNameSL))
                {
                    errors.Add("Account Head Type Name SL already exists.");
                }

                if (errors.Any())
                {
                    _logger.LogWarning("Account Head Type update failed due to duplicate data: {Errors}", string.Join(", ", errors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join("\n", errors)
                    });
                }

                // Update the properties of the existing accountheadtype entity
                existingAccountHeadType.description = accountheadtypeMasterDTO.AccountHeadTypeName?.Trim() ?? "";
                existingAccountHeadType.descriptionsl = accountheadtypeMasterDTO.AccountHeadTypeNameSL?.Trim() ?? "";

                // Save changes to the database
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Account Head Type updated successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating AccountHeadType : {AccountHeadTypeName}, AccountHeadTypeNameSL : {AccountHeadTypeNameSL}",
                       accountheadtypeMasterDTO?.AccountHeadTypeName ?? "unknown", accountheadtypeMasterDTO?.AccountHeadTypeNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }


        [Authorize]
        [HttpPost("delete_accountheadtype")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> DeleteAccountHeadType([FromBody] AccountHeadTypeDTO accountheadtypeMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Delete AccountHeadType attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the accountheadtype to be deleted exists
                var existingAccountHeadType = await _appContext.accountheadtype.FindAsync(accountheadtypeMasterDTO.AccountHeadTypeId, accountheadtypeMasterDTO.BranchId);
                if (existingAccountHeadType == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "AccountHeadType not found."
                    });
                }

                _appContext.accountheadtype.Remove(existingAccountHeadType);
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Account Head Type deleted successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while deleting AccountHeadType : {AccountHeadTypeName}, AccountHeadTypeNameSL : {AccountHeadTypeNameSL}",
                       accountheadtypeMasterDTO?.AccountHeadTypeName ?? "unknown", accountheadtypeMasterDTO?.AccountHeadTypeNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }
    }
}
