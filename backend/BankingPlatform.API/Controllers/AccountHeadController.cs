using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountHead;
using BankingPlatform.Infrastructure.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Linq;

namespace BankingPlatform.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountHeadController : ControllerBase
    {
        private readonly BankingDbContext _appContext;
        private readonly ILogger<AccountHeadController> _logger;
        private readonly CommonFunctions _commonfns;
        public AccountHeadController(BankingDbContext appcontext, ILogger<AccountHeadController> logger, CommonFunctions commonfns)
        {
            _appContext = appcontext;
            _logger = logger;
            _commonfns = commonfns;
        }

        [Authorize]
        [HttpPost("create_accounthead")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> CreateAccountHead([FromBody] AccountHeadDTO accountheadMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Create new AccountHead attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }



                var errors = new List<string>();
                bool anyExists = await _appContext.accounthead
                    .AnyAsync(z =>
                        (
                         z.name.ToLower() == accountheadMasterDTO.AccountHeadName.ToLower()
                         || z.headcode == Convert.ToInt64(accountheadMasterDTO.HeadCode) ||
                         (z.namesl != null && z.namesl.ToLower() == accountheadMasterDTO.AccountHeadNameSL.ToLower())));

                if (anyExists)
                {

                    if (await _appContext.accounthead.AnyAsync(z => z.id != accountheadMasterDTO.AccountHeadId && z.name == accountheadMasterDTO.AccountHeadName.ToLower()))
                        errors.Add("Account Head Name already exists.");

                    if (await _appContext.accounthead.AnyAsync(z => z.id != accountheadMasterDTO.AccountHeadId && z.headcode == Convert.ToInt64(accountheadMasterDTO.HeadCode)))
                        errors.Add("\nAccount Head Code already exists.");

                    if (!string.IsNullOrWhiteSpace(accountheadMasterDTO.AccountHeadNameSL) &&
                        await _appContext.accounthead.AnyAsync(z => z.id != accountheadMasterDTO.AccountHeadId && (z.namesl != null && z.namesl.ToLower() == accountheadMasterDTO.AccountHeadNameSL.ToLower())))
                    {
                        errors.Add("\nAccount Head Name SL already exists.");
                    }
                }

                if (errors.Any())
                {
                    _logger.LogWarning("Account Head update failed due to duplicate data: {Errors}", string.Join(", ", errors));
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
                accountheadMasterDTO.AccountHeadName = accountheadMasterDTO.AccountHeadName?.Trim() ?? "";
                accountheadMasterDTO.AccountHeadNameSL = accountheadMasterDTO.AccountHeadNameSL?.Trim() ?? "";


                await _appContext.accounthead.AddAsync(new AccountHead
                {
                    branchid = accountheadMasterDTO.BranchID,
                    name = accountheadMasterDTO.AccountHeadName,
                    namesl = accountheadMasterDTO.AccountHeadNameSL,
                    accountheadtypeid = Convert.ToInt32(accountheadMasterDTO.AccountHeadType),
                    headcode = Convert.ToInt64(accountheadMasterDTO.HeadCode),
                    isannexure = !string.IsNullOrEmpty(accountheadMasterDTO.IsAnnexure) ? Int32.Parse(accountheadMasterDTO.IsAnnexure) : 0,
                    parentid = !string.IsNullOrEmpty(accountheadMasterDTO.ParentHeadCode) ? Convert.ToInt32(accountheadMasterDTO.ParentHeadCode) : 0,
                    showinreport = !string.IsNullOrEmpty(accountheadMasterDTO.ShowInReport) ? Int32.Parse(accountheadMasterDTO.ShowInReport) : 0
                });
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "AccountHead saved successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating AccountHead : {AccountHeadName},  AccountHeadNameSL : {AccountHeadNameSL}",
                       accountheadMasterDTO?.AccountHeadName ?? "unknown", accountheadMasterDTO?.AccountHeadNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }

        [HttpPost("get_all_accounthead")]
        [EnableRateLimiting("Auth")]
        [Authorize]
        public async Task<IActionResult> GetAllAccountHeads([FromBody] LocationFilterDTO filter)
        {
            try
            {
                var query = _appContext.accounthead.AsNoTracking();

                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var term = filter.SearchTerm;
                    query = query.Where(z =>
                        z.name.Contains(term) ||
                        z.headcode.ToString().Contains(term) ||

                        z.namesl != null && z.namesl.Contains(term));
                }
                var totalCount = await query.CountAsync();

                var itemsRaw = await query
                         .OrderBy(z => z.name)
                         .Skip((filter.PageNumber - 1) * filter.PageSize)
                         .Take(filter.PageSize)
                         .Select(z => new
                         {
                             z.name,
                             z.namesl,
                             z.branchid,
                             z.accountheadtypeid,
                             z.isannexure,
                             z.showinreport,
                             z.headcode,
                             z.id,
                             z.parentid
                         })
                         .ToListAsync();

                var items = new List<AccountHeadDTO>();

                foreach (var z in itemsRaw)
                {
                    string parentHead = await _commonfns.GetHeadCodeFromId(z.parentid, z.branchid);

                    items.Add(new AccountHeadDTO(
                        z.name,
                        z.namesl,
                        z.branchid,
                        z.accountheadtypeid.ToString(),
                        z.isannexure?.ToString() ?? "",
                        z.showinreport.ToString(),
                        z.headcode.ToString(),
                        z.id,
                        parentHead,
                        z.parentid
                    ));
                }


                return Ok(new
                {
                    Success = true,
                    AccountHead = items,
                    TotalCount = totalCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching AccountHeads");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "Unexpected error while fetching AccountHeads"
                });
            }
        }

        [Authorize]
        [HttpPost("modify_accounthead")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> ModifyAccountHead([FromBody] AccountHeadDTO accountheadMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Modify AccountHead attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the accounthead to be modified exists
                var existingAccountHead = await _appContext.accounthead.FindAsync(accountheadMasterDTO.AccountHeadId, accountheadMasterDTO.BranchID);
                if (existingAccountHead == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "AccountHead not found."
                    });
                }

                // Check for duplicates, excluding the current accounthead being modified
                var errors = new List<string>();
                bool anyExists = await _appContext.accounthead
                    .AnyAsync(z => z.id != accountheadMasterDTO.AccountHeadId
                    && z.branchid == accountheadMasterDTO.BranchID
                    &&
                        (z.name.ToLower() == accountheadMasterDTO.AccountHeadName.ToLower() ||
                        z.headcode == Convert.ToInt64(accountheadMasterDTO.HeadCode) ||
                         (z.namesl != null && z.namesl.ToLower() == accountheadMasterDTO.AccountHeadNameSL.ToLower())));

                if (anyExists)
                {
                    if (await _appContext.accounthead.AnyAsync(z => z.id != accountheadMasterDTO.AccountHeadId
                    && z.branchid == accountheadMasterDTO.BranchID
                    && z.name.ToLower() == accountheadMasterDTO.AccountHeadName.ToLower()))
                        errors.Add("Account Head Name already exists.");

                    if (await _appContext.accounthead.AnyAsync(z => z.id != accountheadMasterDTO.AccountHeadId && z.headcode == Convert.ToInt64(accountheadMasterDTO.HeadCode)))
                        errors.Add("Account Head Code already exists.");

                    if (!string.IsNullOrWhiteSpace(accountheadMasterDTO.AccountHeadNameSL) &&
                        await _appContext.accounthead.AnyAsync(z => z.id != accountheadMasterDTO.AccountHeadId && z.branchid == accountheadMasterDTO.BranchID && (z.namesl != null && z.namesl.ToLower() == accountheadMasterDTO.AccountHeadNameSL.ToLower())))
                    {
                        errors.Add("Account Head Name SL already exists.");
                    }
                }

                if (errors.Any())
                {
                    _logger.LogWarning("Account Head update failed due to duplicate data: {Errors}", string.Join(", ", errors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join("\n", errors)
                    });
                }

                // Update the properties of the existing accounthead entity
                existingAccountHead.name = accountheadMasterDTO.AccountHeadName?.Trim() ?? "";
                existingAccountHead.namesl = accountheadMasterDTO.AccountHeadNameSL?.Trim() ?? "";
                existingAccountHead.accountheadtypeid = Convert.ToInt32(accountheadMasterDTO.AccountHeadType);
                existingAccountHead.headcode = Convert.ToInt64(accountheadMasterDTO.HeadCode);
                existingAccountHead.isannexure = !string.IsNullOrEmpty(accountheadMasterDTO.IsAnnexure) ? Int32.Parse(accountheadMasterDTO.IsAnnexure) : 0;
                existingAccountHead.parentid = !string.IsNullOrEmpty(accountheadMasterDTO.ParentHeadCode) ? Convert.ToInt32(accountheadMasterDTO.ParentHeadCode) : 0;
                existingAccountHead.showinreport = !string.IsNullOrEmpty(accountheadMasterDTO.ShowInReport) ? Convert.ToInt32(accountheadMasterDTO.ShowInReport) : 0;

                // Save changes to the database
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Account Head updated successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating AccountHead : {AccountHeadName}, AccountHeadNameSL : {AccountHeadNameSL}",
                       accountheadMasterDTO?.AccountHeadName ?? "unknown", accountheadMasterDTO?.AccountHeadNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }


        [Authorize]
        [HttpPost("delete_accounthead")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> DeleteAccountHead([FromBody] AccountHeadDTO accountheadMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Delete AccountHead attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the accounthead to be deleted exists
                var existingAccountHead = await _appContext.accounthead.FindAsync(accountheadMasterDTO.AccountHeadId, accountheadMasterDTO.BranchID);
                if (existingAccountHead == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "AccountHead not found."
                    });
                }

                _appContext.accounthead.Remove(existingAccountHead);
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Account Head deleted successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while deleting AccountHead : {AccountHeadName}, AccountHeadNameSL : {AccountHeadNameSL}",
                       accountheadMasterDTO?.AccountHeadName ?? "unknown", accountheadMasterDTO?.AccountHeadNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }
    }
}
