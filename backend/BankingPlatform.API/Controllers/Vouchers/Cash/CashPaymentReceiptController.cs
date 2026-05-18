using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Voucher.Cash;
using BankingPlatform.API.Service.Vouchers.Cash;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Vouchers.Cash
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CashPaymentReceiptController : ControllerBase
    {
        private readonly CashPaymentReceiptService _service;
        private readonly ILogger<CashPaymentReceiptController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public CashPaymentReceiptController(CashPaymentReceiptService service, ILogger<CashPaymentReceiptController> logger, CommonFunctions commonFunctions)
        {
            _service = service;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }

        [HttpPost]
        public async Task<IActionResult> AddCashVoucher([FromBody] CashPaymentReceiptDTO dto)
        {
            try
            {
                if (dto == null || dto.Entries == null || dto.Entries.Count == 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "Invalid voucher data." });

                (var result, int voucherNo) = await _service.AddCashPaymentReceiptVoucher(dto);
                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });

                return Ok(new ResponseDto { Success = true, Message = "Cash voucher saved successfully with Voucher No. " + voucherNo });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while adding Cash Payment/Receipt Voucher.");
                await _commonFunctions.LogErrors(ex, nameof(AddCashVoucher), nameof(CashPaymentReceiptController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while saving the voucher. Please try again." });
            }
        }

        [HttpPut("{voucherId}")]
        public async Task<IActionResult> UpdateCashVoucher(int voucherId, [FromBody] CashPaymentReceiptDTO dto)
        {
            try
            {
                if (dto == null || dto.Entries == null || dto.Entries.Count == 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "Invalid voucher data." });

                (var result, int voucherNo) = await _service.UpdateCashPaymentReceiptVoucher(voucherId, dto);
                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });

                return Ok(new ResponseDto { Success = true, Message = "Cash voucher updated successfully with Voucher No. " + voucherNo });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while updating Cash Payment/Receipt Voucher.");
                await _commonFunctions.LogErrors(ex, nameof(UpdateCashVoucher), nameof(CashPaymentReceiptController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while updating the voucher. Please try again." });
            }
        }
    }
}
