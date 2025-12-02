using BankingPlatform.API.Controllers.AccountMasters;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountMasters;
using BankingPlatform.API.DTO.Voucher.Saving;
using BankingPlatform.API.Service.AccountMasters;
using BankingPlatform.API.Service.Vouchers.Saving;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Vouchers.Saving
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SavingDWController : ControllerBase
    {
        private readonly SavingVoucherService _service;
        public ILogger<SavingDWController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public SavingDWController(SavingVoucherService service, ILogger<SavingDWController> logger, CommonFunctions commonFunctions)
        {
            _service = service;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }

        [HttpPost]
        public async Task<IActionResult> AddSavingVoucher([FromBody] SavingVoucherDTO dto)
        {
            try
            {
                if (dto == null || dto.Voucher == null)
                {
                    return BadRequest(new { Success = false, Message = "Invalid voucher data" });
                }
                (var result, int voucherNo) = await _service.AddSavingVoucher(dto);
                if (result != "Success")
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = result
                    });
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Voucher saved successfully with voucher No. " + voucherNo
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while adding Voucher.");
                await _commonFunctions.LogErrors(ex, nameof(AddSavingVoucher), nameof(SavingDWController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while adding Voucher. Please try again later."
                });
            }
        }


        [HttpPut]
        public async Task<IActionResult> UpdateSavingVoucher([FromBody] CommonAccMasterDTO dto)
        {
            try
            {
                //var result = await _service.UpdateGeneralAccountAsync(dto);
                //if (result != "Success") return NotFound(new { Success = false, Message = result });
                return Ok(new { Success = true, message = "Voucher updated successfully" });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(UpdateSavingVoucher),nameof(SavingDWController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }
    }
}
