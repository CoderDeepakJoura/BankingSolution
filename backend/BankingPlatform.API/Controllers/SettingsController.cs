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
                var existingGeneralSettings = await _appcontext.generalsettings
                    .FirstOrDefaultAsync(s => s.branchid == branchId);

                if (existingGeneralSettings != null)
                {
                    existingGeneralSettings.admissionFeeAmount = settingsDTO.GeneralSettings.AdmissionFeeAmount;
                    existingGeneralSettings.admissionFeeAccountId = settingsDTO.GeneralSettings.AdmissionFeeAccountId;
                }
                else
                {
                    var generalSettings = new GeneralSettings
                    {
                        branchid = branchId,
                        admissionFeeAccountId = settingsDTO.GeneralSettings.AdmissionFeeAccountId,
                        admissionFeeAmount = settingsDTO.GeneralSettings.AdmissionFeeAmount
                    };
                    await _appcontext.generalsettings.AddAsync(generalSettings);
                }
                var existingVoucherSettings = await _appcontext.vouchersettings
                    .FirstOrDefaultAsync(s => s.branchid == branchId);

                if (existingVoucherSettings != null)
                {
                    // Entity is tracked, just modify properties
                    existingVoucherSettings.autoverification = settingsDTO.VoucherSettings.AutoVerification;
                }
                else
                {
                    var voucherSettings = new VoucherSettings
                    {
                        branchid = branchId,
                        autoverification = settingsDTO.VoucherSettings.AutoVerification
                    };
                    await _appcontext.vouchersettings.AddAsync(voucherSettings);
                }
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
