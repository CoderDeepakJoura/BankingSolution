using BankingPlatform.API.Common;
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
            if (!ClaimsHelper.BranchMatches(User, branchId))
                return Forbid();

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
                    showBankFDModule          = s?.showBankFDModule          ?? false,
                    showPayrollModule         = s?.showPayrollModule         ?? false,
                    showAgentModule           = s?.showAgentModule           ?? false,
                    enforceSingleSession      = s?.enforceSingleSession      ?? false,
                    telegramChatId                = s?.telegramchatid            ?? "",
                    enableAutoDebit               = s?.enableAutoDebit            ?? false,
                    autoDebitRunHour              = s?.autoDebitRunHour           ?? 2,
                    autoDebitRunMinute            = s?.autoDebitRunMinute         ?? 0,
                    autoDebitProcessRdKist        = s?.autoDebitProcessRdKist     ?? true,
                    autoDebitProcessLoanRecovery  = s?.autoDebitProcessLoanRecovery ?? true,
                }
            });
        }

        [HttpPost]
        public async Task<IActionResult> Save([FromBody] SuperUserSettingsDTO dto)
        {
            // Only super-users may change these operational settings
            if (!ClaimsHelper.GetIsSu(User))
                return Forbid();

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
                existing.showBankFDModule          = dto.ShowBankFDModule;
                existing.showPayrollModule         = dto.ShowPayrollModule;
                existing.showAgentModule           = dto.ShowAgentModule;
                existing.enforceSingleSession      = dto.EnforceSingleSession;
                existing.telegramchatid              = dto.TelegramChatId;
                existing.enableAutoDebit             = dto.EnableAutoDebit;
                existing.autoDebitRunHour            = dto.AutoDebitRunHour;
                existing.autoDebitRunMinute          = dto.AutoDebitRunMinute;
                existing.autoDebitProcessRdKist      = dto.AutoDebitProcessRdKist;
                existing.autoDebitProcessLoanRecovery = dto.AutoDebitProcessLoanRecovery;
            }
            else
            {
                await _db.superusersettings.AddAsync(new SuperUserSettings
                {
                    branchid                      = dto.BranchId,
                    allowSavingInterestChange      = dto.AllowSavingInterestChange,
                    allowFDInterestChange          = dto.AllowFDInterestChange,
                    allowRDInterestChange          = dto.AllowRDInterestChange,
                    allowLoanInterestChange        = dto.AllowLoanInterestChange,
                    enableIBTransactions           = dto.EnableIBTransactions,
                    allowGSTDeduction              = dto.AllowGSTDeduction,
                    showBankFDModule               = dto.ShowBankFDModule,
                    showPayrollModule              = dto.ShowPayrollModule,
                    showAgentModule               = dto.ShowAgentModule,
                    enforceSingleSession           = dto.EnforceSingleSession,
                    telegramchatid                 = dto.TelegramChatId,
                    enableAutoDebit                = dto.EnableAutoDebit,
                    autoDebitRunHour               = dto.AutoDebitRunHour,
                    autoDebitRunMinute             = dto.AutoDebitRunMinute,
                    autoDebitProcessRdKist         = dto.AutoDebitProcessRdKist,
                    autoDebitProcessLoanRecovery   = dto.AutoDebitProcessLoanRecovery,
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
        public bool ShowBankFDModule { get; set; } = false;
        public bool ShowPayrollModule { get; set; } = false;
        public bool ShowAgentModule { get; set; } = false;
        public bool EnforceSingleSession { get; set; } = false;
        public string? TelegramChatId { get; set; }
        public bool EnableAutoDebit { get; set; } = false;
        public int AutoDebitRunHour { get; set; } = 2;
        public int AutoDebitRunMinute { get; set; } = 0;
        public bool AutoDebitProcessRdKist { get; set; } = true;
        public bool AutoDebitProcessLoanRecovery { get; set; } = true;
    }
}
