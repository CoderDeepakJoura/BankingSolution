using BankingPlatform.API.Service.Receipt;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Receipt
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ReceiptController : ControllerBase
    {
        private readonly ReceiptService _service;
        public ReceiptController(ReceiptService service) => _service = service;

        [HttpGet("{branchId}/{voucherType}/{voucherSubType}/{voucherNo}")]
        public async Task<IActionResult> GetReceipt(
            [FromRoute] int branchId,
            [FromRoute] int voucherType,
            [FromRoute] int voucherSubType,
            [FromRoute] int voucherNo,
            [FromQuery] int? accountId = null,
            [FromQuery] decimal? principalAmount = null,
            [FromQuery] decimal? intAmount = null)
        {
            var result = await _service.GenerateReceiptAsync(
                branchId, voucherType, voucherSubType, voucherNo,
                accountId, principalAmount, intAmount);
            if (result == null) return NotFound(new { success = false, message = "Voucher not found." });
            Response.Headers.Append("X-Receipt-No", result.Value.ReceiptNo.ToString());
            return File(result.Value.Pdf, "application/pdf", $"Receipt-{result.Value.ReceiptNo}.pdf");
        }
    }
}
