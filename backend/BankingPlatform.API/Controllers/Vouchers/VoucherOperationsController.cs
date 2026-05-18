using BankingPlatform.API.DTO;
using BankingPlatform.API.Service.Vouchers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Vouchers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class VoucherOperationsController : ControllerBase
    {
        private readonly VoucherOperationsService _service;
        private readonly ILogger<VoucherOperationsController> _logger;

        public VoucherOperationsController(VoucherOperationsService service, ILogger<VoucherOperationsController> logger)
        {
            _service = service;
            _logger = logger;
        }

        [HttpGet("preview/{branchId}/{voucherDate}/{voucherNo}")]
        public async Task<IActionResult> Preview([FromRoute] int branchId, DateTime voucherDate, int voucherNo)
        {
            var (success, message, data) = await _service.GetPreviewAsync(branchId, voucherNo, voucherDate);
            if (!success) return BadRequest(new ResponseDto { Success = false, Message = message });
            return Ok(new { Success = true, data });
        }

        [HttpDelete("{branchId}/{voucherDate}/{voucherNo}")]
        public async Task<IActionResult> Delete([FromRoute] int branchId, DateTime voucherDate, int voucherNo)
        {
            try
            {
                var (success, message) = await _service.DeleteVoucherAsync(branchId, voucherNo, voucherDate);
                if (!success) return BadRequest(new ResponseDto { Success = false, Message = message });
                return Ok(new ResponseDto { Success = true, Message = message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting voucher {VoucherNo}", voucherNo);
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while deleting the voucher." });
            }
        }
    }
}
