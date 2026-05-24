using BankingPlatform.API.Common;
using BankingPlatform.API.DTO.Services;
using BankingPlatform.API.Service.Services;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Services
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class AccServiceDetailController : ControllerBase
    {
        private readonly AccServiceDetailService _service;
        private readonly CommonFunctions _commonFunctions;

        public AccServiceDetailController(AccServiceDetailService service, CommonFunctions commonFunctions)
        {
            _service = service;
            _commonFunctions = commonFunctions;
        }

        [HttpGet("{branchId}")]
        public async Task<IActionResult> GetAll(int branchId)
        {
            var items = await _service.GetAllAsync(branchId);
            return Ok(new { Success = true, items });
        }

        [HttpPost]
        public async Task<IActionResult> Add([FromBody] AccServiceDetailDTO dto)
        {
            try
            {
                var result = await _service.AddAsync(dto);
                if (result != "success") return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "Account service assigned successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(Add), nameof(AccServiceDetailController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error while assigning service." });
            }
        }

        [HttpDelete("{branchId}/{id}")]
        public async Task<IActionResult> Delete(int id, int branchId)
        {
            try
            {
                var ok = await _service.DeleteAsync(id, branchId);
                if (!ok) return NotFound();
                return Ok(new ResponseDto { Success = true, Message = "Deleted successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(Delete), nameof(AccServiceDetailController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error deleting assignment." });
            }
        }
    }
}
