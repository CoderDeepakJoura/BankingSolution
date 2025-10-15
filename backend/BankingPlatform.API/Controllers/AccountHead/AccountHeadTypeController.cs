using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountHead;
using BankingPlatform.Infrastructure.Models.AccHeads;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.AccountHead
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountHeadTypeController : ControllerBase
    {
        private readonly BankingDbContext _appContext;
        private readonly CommonFunctions _commonFunctions;
        private readonly ILogger<AccountHeadTypeController> _logger;
        public AccountHeadTypeController(BankingDbContext appcontext, ILogger<AccountHeadTypeController> logger, CommonFunctions commonFunctions)
        {
            _appContext = appcontext;
            _logger = logger;
            _commonFunctions = commonFunctions;
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
                    .Where(z => z.branchid == accountheadtypeMasterDTO.BranchId &&
                                (
                                    z.description.ToLower() == normalizedName ||
                                    normalizedNameSL != null && z.descriptionsl != null && z.descriptionsl.ToLower() == normalizedNameSL
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
                    descriptionsl = accountheadtypeMasterDTO.AccountHeadTypeNameSL,
                    categoryid = accountheadtypeMasterDTO.CategoryId
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
                await _commonFunctions.LogErrors(ex, nameof(CreateAccountHeadType), "AccountHeadTypeController");
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

                var totalCount = await query.CountAsync();

                var items = await query
                    .OrderBy(z => z.description)
                    .Skip((filter.PageNumber - 1) * filter.PageSize)
                    .Take(filter.PageSize)
                    .Select(z => new AccountHeadTypeDTO(
                        z.description,
                        z.descriptionsl,
                        z.id,
                        z.branchid,
                        z.categoryid,
                        "" 
                    ))
                    .ToListAsync();

                foreach (var item in items)
                    item.CategoryName = _commonFunctions.getHeadTypeCategoryNameFromId(item.CategoryId);

                // Step 5: Apply final in-memory filter (including CategoryName)
                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var term = filter.SearchTerm.ToLower();
                    items = items
                        .Where(x =>
                            x.AccountHeadTypeName.ToLower().Contains(term) ||
                            (!string.IsNullOrEmpty(x.AccountHeadTypeNameSL) && x.AccountHeadTypeNameSL.ToLower().Contains(term)) ||
                            (!string.IsNullOrEmpty(x.CategoryName) && x.CategoryName.ToLower().Contains(term))
                        )
                        .ToList();
                }

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
                await _commonFunctions.LogErrors(ex, nameof(GetAllAccountHeadTypes), "AccountHeadTypeController");
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
                                    normalizedNameSL != null && z.descriptionsl != null && z.descriptionsl.ToLower() == normalizedNameSL
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
                existingAccountHeadType.categoryid = accountheadtypeMasterDTO.CategoryId;

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
                await _commonFunctions.LogErrors(ex, nameof(ModifyAccountHeadType), "AccountHeadTypeController");
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
                        Message = "Account Head Type not found."
                    });
                }
                if(await _commonFunctions.CheckIfAccountHeadTypeInUse(accountheadtypeMasterDTO.AccountHeadTypeId, accountheadtypeMasterDTO.BranchId))
                {
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Account Head Type is in use and cannot be deleted."
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
                await _commonFunctions.LogErrors(ex, nameof(DeleteAccountHeadType), "AccountHeadTypeController");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }
    }
}
