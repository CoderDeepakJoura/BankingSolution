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
    public class RDKistController : ControllerBase
    {
        private readonly RDKistVoucherService _service;
        private readonly ILogger<RDKistController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public RDKistController(RDKistVoucherService service, ILogger<RDKistController> logger, CommonFunctions commonFunctions)
        {
            _service = service;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }

        [HttpPost]
        public async Task<IActionResult> AddRDKistVoucher([FromBody] RDKistVoucherDTO dto)
        {
            try
            {
                if (dto == null || dto.RdAccountId <= 0)
                    return BadRequest(new { Success = false, Message = "Invalid voucher data" });

                (var result, int voucherNo) = await _service.AddRDKistVoucher(dto);

                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "RD Kist Voucher saved successfully with voucher No. " + voucherNo
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while adding RD Kist Voucher.");
                await _commonFunctions.LogErrors(ex, nameof(AddRDKistVoucher), nameof(RDKistController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while adding RD Kist Voucher. Please try again later."
                });
            }
        }
    }
}
