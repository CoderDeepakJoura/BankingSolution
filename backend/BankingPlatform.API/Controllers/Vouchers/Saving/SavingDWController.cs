using BankingPlatform.API.Controllers.AccountMasters;
using BankingPlatform.API.DTO;
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


        [HttpPut("{voucherId}")]
        public async Task<IActionResult> UpdateSavingVoucher(int voucherId, [FromBody] SavingVoucherDTO dto)
        {
            try
            {
                if (dto == null || dto.Voucher == null)
                    return BadRequest(new { Success = false, Message = "Invalid voucher data" });
                (var result, int voucherNo) = await _service.UpdateSavingVoucher(voucherId, dto);
                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new { Success = true, Message = "Voucher updated successfully with voucher No. " + voucherNo, data = new { voucherNo } });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while updating Saving Voucher.");
                await _commonFunctions.LogErrors(ex, nameof(UpdateSavingVoucher), nameof(SavingDWController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while updating Voucher. Please try again later." });
            }
        }
    }
}
