using BankingPlatform.API.Common;
using BankingPlatform.API.DTO.GST;
using BankingPlatform.API.Service.GST;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.GST
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class GSTSettingController : ControllerBase
    {
        private readonly GSTSettingService _service;
        private readonly CommonFunctions _commonFunctions;

        public GSTSettingController(GSTSettingService service, CommonFunctions commonFunctions)
        {
            _service = service;
            _commonFunctions = commonFunctions;
        }

        [HttpGet("{branchId}")]
        public async Task<IActionResult> Get(int branchId)
        {
            var result = await _service.GetAsync(branchId);
            return Ok(new { Success = true, data = result });
        }

        [HttpPost]
        public async Task<IActionResult> Save([FromBody] GSTSettingDTO dto)
        {
            try
            {
                var result = await _service.SaveAsync(dto);
                if (result != "success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "GST Settings saved successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(Save), nameof(GSTSettingController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error while saving GST Settings." });
            }
        }
    }
}
