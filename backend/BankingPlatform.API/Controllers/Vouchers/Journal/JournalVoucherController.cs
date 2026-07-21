using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Voucher.Journal;
using BankingPlatform.API.Service.Vouchers.Journal;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Vouchers.Journal
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class JournalVoucherController : ControllerBase
    {
        private readonly JournalVoucherService _service;
        private readonly ILogger<JournalVoucherController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public JournalVoucherController(JournalVoucherService service, ILogger<JournalVoucherController> logger, CommonFunctions commonFunctions)
        {
            _service = service;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }

        [HttpPost]
        public async Task<IActionResult> AddJournalVoucher([FromBody] JournalVoucherDTO dto)
        {
            try
            {
                if (dto == null || dto.Entries == null || dto.Entries.Count == 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "Invalid voucher data." });

                (var result, int voucherNo) = await _service.AddJournalVoucher(dto);
                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });

                return Ok(new ResponseDto { Success = true, Message = "Journal voucher saved successfully with Voucher No. " + voucherNo });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while adding Journal Voucher.");
                await _commonFunctions.LogErrors(ex, nameof(AddJournalVoucher), nameof(JournalVoucherController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while saving the voucher. Please try again." });
            }
        }

        [HttpGet("{voucherId}/gst")]
        public async Task<IActionResult> GetGstRestoreDetails(int voucherId, [FromQuery] int brId)
        {
            try
            {
                var items = await _service.GetGstRestoreDetails(voucherId, brId);
                return Ok(new { Success = true, data = items });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching GST restore details for voucher {VoucherId}.", voucherId);
                await _commonFunctions.LogErrors(ex, nameof(GetGstRestoreDetails), nameof(JournalVoucherController));
                return BadRequest(new ResponseDto { Success = false, Message = "Failed to fetch GST details." });
            }
        }

        [HttpPut("{voucherId}")]
        public async Task<IActionResult> UpdateJournalVoucher(int voucherId, [FromBody] JournalVoucherDTO dto)
        {
            try
            {
                if (dto == null || dto.Entries == null || dto.Entries.Count == 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "Invalid voucher data." });

                (var result, int voucherNo) = await _service.UpdateJournalVoucher(voucherId, dto);
                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });

                return Ok(new ResponseDto { Success = true, Message = "Journal voucher updated successfully with Voucher No. " + voucherNo });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while updating Journal Voucher.");
                await _commonFunctions.LogErrors(ex, nameof(UpdateJournalVoucher), nameof(JournalVoucherController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while updating the voucher. Please try again." });
            }
        }
    }
}
