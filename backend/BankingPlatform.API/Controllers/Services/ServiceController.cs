using BankingPlatform.API.Common;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Services;
using BankingPlatform.API.Service.Services;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Services
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ServiceController : ControllerBase
    {
        private readonly ServiceMasterService _service;
        private readonly CommonFunctions _commonFunctions;

        public ServiceController(ServiceMasterService service, CommonFunctions commonFunctions)
        {
            _service = service;
            _commonFunctions = commonFunctions;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ServiceDTO dto)
        {
            try
            {
                var result = await _service.CreateAsync(dto);
                if (result != "success") return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "Service saved successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(Create), nameof(ServiceController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error while saving Service." });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] ServiceDTO dto)
        {
            try
            {
                var result = await _service.UpdateAsync(dto);
                if (result != "success") return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "Service updated successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(Update), nameof(ServiceController));
                return BadRequest(new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        [HttpDelete("{branchId}/{id}")]
        public async Task<IActionResult> Delete(int id, int branchId)
        {
            try
            {
                var ok = await _service.DeleteAsync(id, branchId);
                if (!ok) return NotFound();
                return Ok(new ResponseDto { Success = true, Message = "Service deleted successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(Delete), nameof(ServiceController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error deleting Service." });
            }
        }

        [HttpGet("{id}/{branchId}")]
        public async Task<IActionResult> GetById(int id, int branchId)
        {
            var result = await _service.GetByIdAsync(id, branchId);
            if (result == null) return NotFound();
            return Ok(new { Success = true, data = result });
        }

        [HttpPost("get-all/{branchId}")]
        public async Task<IActionResult> GetAll(int branchId, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var (items, total) = await _service.GetAllAsync(branchId, filter);
                return Ok(new { Success = true, items, TotalCount = total });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(GetAll), nameof(ServiceController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error fetching Services." });
            }
        }

        [HttpGet("list/{branchId}")]
        public async Task<IActionResult> GetList(int branchId)
        {
            var items = await _service.GetListAsync(branchId);
            return Ok(new { Success = true, items });
        }
    }
}
