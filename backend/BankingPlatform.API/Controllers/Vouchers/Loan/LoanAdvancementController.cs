using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Voucher.Loan;
using BankingPlatform.API.Service.Vouchers.Loan;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Vouchers.Loan
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class LoanAdvancementController : ControllerBase
    {
        private readonly LoanAdvancementVoucherService _service;
        private readonly ILogger<LoanAdvancementController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public LoanAdvancementController(LoanAdvancementVoucherService service, ILogger<LoanAdvancementController> logger, CommonFunctions commonFunctions)
        {
            _service = service;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }

        [HttpPost]
        public async Task<IActionResult> AddLoanAdvancement([FromBody] LoanAdvancementVoucherDTO dto)
        {
            try
            {
                if (dto == null || dto.LoanAccountId <= 0 || dto.TotalAmount <= 0 || dto.CreditItems.Count == 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "Invalid request data." });

                (var result, int voucherNo) = await _service.AddLoanAdvancementVoucherAsync(dto);

                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });

                return Ok(new { Success = true, Message = "Loan advancement voucher created successfully.", data = new { voucherNo } });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating loan advancement voucher.");
                await _commonFunctions.LogErrors(ex, nameof(AddLoanAdvancement), nameof(LoanAdvancementController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while creating the voucher." });
            }
        }

        [HttpPut("{voucherId}")]
        public async Task<IActionResult> UpdateLoanAdvancement(int voucherId, [FromBody] LoanAdvancementVoucherDTO dto)
        {
            try
            {
                if (dto == null || dto.LoanAccountId <= 0 || dto.TotalAmount <= 0 || dto.CreditItems.Count == 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "Invalid request data." });

                (var result, int voucherNo) = await _service.UpdateLoanAdvancementVoucherAsync(voucherId, dto);

                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });

                return Ok(new { Success = true, Message = "Loan advancement voucher updated successfully.", data = new { voucherNo } });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating loan advancement voucher {VoucherId}.", voucherId);
                await _commonFunctions.LogErrors(ex, nameof(UpdateLoanAdvancement), nameof(LoanAdvancementController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while updating the voucher." });
            }
        }
    }
}
