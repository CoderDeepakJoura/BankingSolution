using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Voucher.RD;
using BankingPlatform.API.Service.Vouchers.RD;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Vouchers.RD
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RDMultipleKistController : ControllerBase
    {
        private readonly RDMultipleKistVoucherService _service;
        private readonly ILogger<RDMultipleKistController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public RDMultipleKistController(
            RDMultipleKistVoucherService service,
            ILogger<RDMultipleKistController> logger,
            CommonFunctions commonFunctions)
        {
            _service = service;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }

        [HttpPut("{voucherId}")]
        public async Task<IActionResult> Update(int voucherId, [FromBody] RDMultipleKistVoucherDTO dto)
        {
            try
            {
                if (dto == null || dto.Items == null || dto.Items.Count == 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "No kist items provided." });

                (var result, int voucherNo) = await _service.UpdateAsync(voucherId, dto);

                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });

                return Ok(new ResponseDto { Success = true, Message = $"RD Multiple Kist updated successfully. Voucher No: {voucherNo}" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating RD Multiple Kist Voucher.");
                await _commonFunctions.LogErrors(ex, nameof(Update), nameof(RDMultipleKistController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred. Please try again." });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Add([FromBody] RDMultipleKistVoucherDTO dto)
        {
            try
            {
                if (dto == null || dto.Items == null || dto.Items.Count == 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "No kist items provided." });

                (var result, int voucherNo) = await _service.AddAsync(dto);

                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = $"RD Multiple Kist saved successfully. Voucher No: {voucherNo}"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding RD Multiple Kist Voucher.");
                await _commonFunctions.LogErrors(ex, nameof(Add), nameof(RDMultipleKistController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred. Please try again." });
            }
        }
    }
}
