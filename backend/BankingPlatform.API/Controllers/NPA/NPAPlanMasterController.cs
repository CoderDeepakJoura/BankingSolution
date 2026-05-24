using BankingPlatform.API.Common;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.NPA;
using BankingPlatform.API.Service.NPA;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.NPA
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class NPAPlanMasterController : ControllerBase
    {
        private readonly NPAPlanMasterService _service;
        private readonly CommonFunctions _commonFunctions;

        public NPAPlanMasterController(NPAPlanMasterService service, CommonFunctions commonFunctions)
        {
            _service = service;
            _commonFunctions = commonFunctions;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] NPAPlanMasterDTO dto)
        {
            try
            {
                var result = await _service.CreateAsync(dto);
                if (result != "success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "NPA Plan saved successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(Create), nameof(NPAPlanMasterController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error while saving NPA Plan." });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] NPAPlanMasterDTO dto)
        {
            try
            {
                var result = await _service.UpdateAsync(dto);
                if (result != "success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "NPA Plan updated successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(Update), nameof(NPAPlanMasterController));
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
                return Ok(new ResponseDto { Success = true, Message = "NPA Plan deleted successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(Delete), nameof(NPAPlanMasterController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error deleting NPA Plan." });
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
                await _commonFunctions.LogErrors(ex, nameof(GetAll), nameof(NPAPlanMasterController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error fetching NPA Plans." });
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
