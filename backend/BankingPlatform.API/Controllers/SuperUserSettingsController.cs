using BankingPlatform.Infrastructure.Models.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SuperUserSettingsController : ControllerBase
    {
        private readonly BankingDbContext _db;

        public SuperUserSettingsController(BankingDbContext db) => _db = db;

        [HttpGet("{branchId}")]
        public async Task<IActionResult> Get([FromRoute] int branchId)
        {
            var s = await _db.superusersettings
                .FirstOrDefaultAsync(x => x.branchid == branchId);

            return Ok(new
            {
                success = true,
                data = new
                {
                    branchId,
                    allowSavingInterestChange = s?.allowSavingInterestChange ?? false,
                    allowFDInterestChange     = s?.allowFDInterestChange     ?? false,
                    allowRDInterestChange     = s?.allowRDInterestChange     ?? false,
                    allowLoanInterestChange   = s?.allowLoanInterestChange   ?? false,
                    enableIBTransactions      = s?.enableIBTransactions      ?? true,
                    allowGSTDeduction         = s?.allowGSTDeduction         ?? true,
                }
            });
        }

        [HttpPost]
        public async Task<IActionResult> Save([FromBody] SuperUserSettingsDTO dto)
        {
            var existing = await _db.superusersettings
                .FirstOrDefaultAsync(x => x.branchid == dto.BranchId);

            if (existing != null)
            {
                existing.allowSavingInterestChange = dto.AllowSavingInterestChange;
                existing.allowFDInterestChange     = dto.AllowFDInterestChange;
                existing.allowRDInterestChange     = dto.AllowRDInterestChange;
                existing.allowLoanInterestChange   = dto.AllowLoanInterestChange;
                existing.enableIBTransactions      = dto.EnableIBTransactions;
                existing.allowGSTDeduction         = dto.AllowGSTDeduction;
            }
            else
            {
                await _db.superusersettings.AddAsync(new SuperUserSettings
                {
                    branchid                   = dto.BranchId,
                    allowSavingInterestChange   = dto.AllowSavingInterestChange,
                    allowFDInterestChange       = dto.AllowFDInterestChange,
                    allowRDInterestChange       = dto.AllowRDInterestChange,
                    allowLoanInterestChange     = dto.AllowLoanInterestChange,
                    enableIBTransactions        = dto.EnableIBTransactions,
                    allowGSTDeduction           = dto.AllowGSTDeduction,
                });
            }

            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Settings saved." });
        }
    }

    public class SuperUserSettingsDTO
    {
        public int BranchId { get; set; }
        public bool AllowSavingInterestChange { get; set; }
        public bool AllowFDInterestChange { get; set; }
        public bool AllowRDInterestChange { get; set; }
        public bool AllowLoanInterestChange { get; set; }
        public bool EnableIBTransactions { get; set; }
        public bool AllowGSTDeduction { get; set; }
    }
}
