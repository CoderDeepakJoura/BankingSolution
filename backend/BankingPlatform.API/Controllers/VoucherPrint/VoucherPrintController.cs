using BankingPlatform.API.Service.VoucherPrint;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.VoucherPrint
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class VoucherPrintController : ControllerBase
    {
        private readonly VoucherPrintService _service;

        public VoucherPrintController(VoucherPrintService service) => _service = service;

        // GET api/VoucherPrint/settings/1
        [HttpGet("settings/{branchId}")]
        public async Task<IActionResult> GetSettings([FromRoute] int branchId)
        {
            try
            {
                var settings = await _service.GetSettingsAsync(branchId);
                return Ok(new { success = true, data = settings });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST api/VoucherPrint/settings/1
        [HttpPost("settings/{branchId}")]
        public async Task<IActionResult> SaveSettings([FromRoute] int branchId, [FromBody] List<VoucherPrintSettingDTO> settings)
        {
            try
            {
                await _service.SaveSettingsAsync(branchId, settings);
                return Ok(new { success = true, message = "Voucher print settings saved successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // GET api/VoucherPrint/search/1?fromDate=2026-09-01&toDate=2026-09-24
        [HttpGet("search/{branchId}")]
        public async Task<IActionResult> SearchVouchers(
            [FromRoute] int branchId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] int voucherType = 0,
            [FromQuery] int voucherSubType = 0,
            [FromQuery] int voucherNo = 0)
        {
            try
            {
                var results = await _service.SearchVouchersAsync(branchId, fromDate, toDate, voucherType, voucherSubType, voucherNo);
                return Ok(new { success = true, data = results });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // GET api/VoucherPrint/1/6/11/321  →  returns PDF bytes
        [HttpGet("{branchId}/{voucherType}/{voucherSubType}/{voucherNo}")]
        public async Task<IActionResult> PrintVoucher(
            [FromRoute] int branchId,
            [FromRoute] int voucherType,
            [FromRoute] int voucherSubType,
            [FromRoute] int voucherNo,
            [FromQuery] int copies = 1,
            [FromQuery] DateTime? voucherDate = null)
        {
            try
            {
                var (pdf, filename) = await _service.GeneratePdfAsync(branchId, voucherType, voucherSubType, voucherNo, copies, voucherDate);
                return File(pdf, "application/pdf", filename);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
