using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.Controllers.Member;
using BankingPlatform.API.DTO.Settings;
using BankingPlatform.Infrastructure.Models.Settings;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SettingsController : ControllerBase
    {
        private readonly BankingDbContext _appcontext;
        private readonly CommonFunctions _commonfunctions;
        public SettingsController(BankingDbContext appcontext, CommonFunctions commonfunctions)
        {
            _appcontext = appcontext;
            _commonfunctions = commonfunctions;
        }

        [HttpGet("{branchId}")]
        public async Task<IActionResult> GetSettings([FromRoute] int branchId)
        {
            try
            {

                SettingsDTO settingsDTO = await _commonfunctions.GetAllSettings(branchId);
                return Ok(new
                {
                    Success = true,
                    data = settingsDTO
                });
            }
            catch(Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetSettings), nameof(MemberController));
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching settings.",
                });
            }
        }

        [HttpPost]
        public async Task<IActionResult> InsertSettings([FromBody] SettingsDTO settingsDTO)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            using var transaction = await _appcontext.Database.BeginTransactionAsync();
            try
            {
                var branchId = settingsDTO.GeneralSettings.BranchId;
                if (settingsDTO.GeneralSettings != null)
                {
                    var existingGeneralSettings = await _appcontext.generalsettings
                        .FirstOrDefaultAsync(s => s.branchid == branchId);

                    if (existingGeneralSettings != null)
                    {
                        // Update existing
                        existingGeneralSettings.admissionFeeAccountId = settingsDTO.GeneralSettings.AdmissionFeeAccountId;
                        existingGeneralSettings.admissionFeeAmount = settingsDTO.GeneralSettings.AdmissionFeeAmount;
                        existingGeneralSettings.defaultCashAccountId = settingsDTO.GeneralSettings.DefaultCashAccountId;
                        existingGeneralSettings.minimumMemberAge = settingsDTO.GeneralSettings.MinimumMemberAge;
                        existingGeneralSettings.shareMoneyPercentageForLoan = settingsDTO.GeneralSettings.ShareMoneyPercentageForLoan;
                        existingGeneralSettings.bankFDMaturityReminder = settingsDTO.GeneralSettings.BankFDMaturityReminder;
                        existingGeneralSettings.bankFDMaturityReminderDays = settingsDTO.GeneralSettings.BankFDMaturityReminderDays;
                    }
                    else
                    {
                        // Insert new
                        var generalSettings = new GeneralSettings
                        {
                            branchid = branchId,
                            admissionFeeAccountId = settingsDTO.GeneralSettings.AdmissionFeeAccountId,
                            admissionFeeAmount = settingsDTO.GeneralSettings.AdmissionFeeAmount,
                            defaultCashAccountId = settingsDTO.GeneralSettings.DefaultCashAccountId,
                            minimumMemberAge = settingsDTO.GeneralSettings.MinimumMemberAge,
                            shareMoneyPercentageForLoan = settingsDTO.GeneralSettings.ShareMoneyPercentageForLoan,
                            bankFDMaturityReminder = settingsDTO.GeneralSettings.BankFDMaturityReminder,
                            bankFDMaturityReminderDays = settingsDTO.GeneralSettings.BankFDMaturityReminderDays
                        };
                        await _appcontext.generalsettings.AddAsync(generalSettings);
                    }
                }

                // ==================== ACCOUNT SETTINGS ====================
                if (settingsDTO.AccountSettings != null)
                {
                    var existingAccountSettings = await _appcontext.accountsettings
                        .FirstOrDefaultAsync(s => s.branchid == branchId);

                    if (existingAccountSettings != null)
                    {
                        // Update existing
                        existingAccountSettings.accountVerification = settingsDTO.AccountSettings.AccountVerification;
                        existingAccountSettings.memberKYC = settingsDTO.AccountSettings.MemberKYC;
                        existingAccountSettings.savingAccountLength = settingsDTO.AccountSettings.SavingAccountLength;
                        existingAccountSettings.loanAccountLength = settingsDTO.AccountSettings.LoanAccountLength;
                        existingAccountSettings.fdAccountLength = settingsDTO.AccountSettings.FDAccountLength;
                        existingAccountSettings.rdAccountLength = settingsDTO.AccountSettings.RDAccountLength;
                        existingAccountSettings.shareAccountLength = settingsDTO.AccountSettings.ShareAccountLength;
                    }
                    else
                    {
                        // Insert new
                        var accountSettings = new AccountSettings
                        {
                            branchid = branchId,
                            accountVerification = settingsDTO.AccountSettings.AccountVerification,
                            memberKYC = settingsDTO.AccountSettings.MemberKYC,
                            savingAccountLength = settingsDTO.AccountSettings.SavingAccountLength,
                            loanAccountLength = settingsDTO.AccountSettings.LoanAccountLength,
                            fdAccountLength = settingsDTO.AccountSettings.FDAccountLength,
                            rdAccountLength = settingsDTO.AccountSettings.RDAccountLength,
                            shareAccountLength = settingsDTO.AccountSettings.ShareAccountLength
                        };
                        await _appcontext.accountsettings.AddAsync(accountSettings);
                    }
                }

                // ==================== VOUCHER SETTINGS ====================
                if (settingsDTO.VoucherSettings != null)
                {
                    var existingVoucherSettings = await _appcontext.vouchersettings
                        .FirstOrDefaultAsync(s => s.branchid == branchId);

                    if (existingVoucherSettings != null)
                    {
                        // Update existing
                        existingVoucherSettings.voucherPrinting = settingsDTO.VoucherSettings.VoucherPrinting;
                        existingVoucherSettings.singleVoucherEntry = settingsDTO.VoucherSettings.SingleVoucherEntry;
                        existingVoucherSettings.voucherNumberSetting = settingsDTO.VoucherSettings.VoucherNumberSetting;
                        existingVoucherSettings.autoVerification = settingsDTO.VoucherSettings.AutoVerification;
                        existingVoucherSettings.receiptNoSetting = settingsDTO.VoucherSettings.ReceiptNoSetting;
                    }
                    else
                    {
                        // Insert new
                        var voucherSettings = new VoucherSettings
                        {
                            branchid = branchId,
                            voucherPrinting = settingsDTO.VoucherSettings.VoucherPrinting,
                            singleVoucherEntry = settingsDTO.VoucherSettings.SingleVoucherEntry,
                            voucherNumberSetting = settingsDTO.VoucherSettings.VoucherNumberSetting,
                            autoVerification = settingsDTO.VoucherSettings.AutoVerification,
                            receiptNoSetting = settingsDTO.VoucherSettings.ReceiptNoSetting,
                        };
                        await _appcontext.vouchersettings.AddAsync(voucherSettings);
                    }
                }

                // ==================== TDS SETTINGS ====================
                if (settingsDTO.TDSSettings != null)
                {
                    var existingTDSSettings = await _appcontext.tdssettings
                        .FirstOrDefaultAsync(s => s.branchid == branchId);

                    if (existingTDSSettings != null)
                    {
                        // Update existing
                        existingTDSSettings.bankFDTDSApplicability = settingsDTO.TDSSettings.BankFDTDSApplicability;
                        existingTDSSettings.bankFDTDSRate = settingsDTO.TDSSettings.BankFDTDSRate;
                        existingTDSSettings.bankFDTDSDeductionFrequency = settingsDTO.TDSSettings.BankFDTDSDeductionFrequency;
                        existingTDSSettings.bankFDTDSLedgerAccountId = settingsDTO.TDSSettings.BankFDTDSLedgerAccountId;
                    }
                    else
                    {
                        // Insert new
                        var tdsSettings = new TDSSettings
                        {
                            branchid = branchId,
                            bankFDTDSApplicability = settingsDTO.TDSSettings.BankFDTDSApplicability,
                            bankFDTDSRate = settingsDTO.TDSSettings.BankFDTDSRate,
                            bankFDTDSDeductionFrequency = settingsDTO.TDSSettings.BankFDTDSDeductionFrequency,
                            bankFDTDSLedgerAccountId = settingsDTO.TDSSettings.BankFDTDSLedgerAccountId
                        };
                        await _appcontext.tdssettings.AddAsync(tdsSettings);
                    }
                }

                // ==================== PRINTING SETTINGS ====================
                if (settingsDTO.PrintingSettings != null)
                {
                    var existingPrintingSettings = await _appcontext.printingsettings
                        .FirstOrDefaultAsync(s => s.branchid == branchId);

                    if (existingPrintingSettings != null)
                    {
                        // Update existing
                        existingPrintingSettings.fdReceiptSetting = settingsDTO.PrintingSettings.FDReceiptSetting;
                        existingPrintingSettings.rdCertificateSetting = settingsDTO.PrintingSettings.RDCertificateSetting;
                    }
                    else
                    {
                        // Insert new
                        var printingSettings = new PrintingSettings
                        {
                            branchid = branchId,
                            fdReceiptSetting = settingsDTO.PrintingSettings.FDReceiptSetting,
                            rdCertificateSetting = settingsDTO.PrintingSettings.RDCertificateSetting
                        };
                        await _appcontext.printingsettings.AddAsync(printingSettings);
                    }
                }

                // Save all changes
                await _appcontext.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Settings updated successfully."
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(InsertSettings), nameof(MemberController));
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while updating settings.",
                });
            }
        }
    }
}
