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
    public class NPAPlanCategoryController : ControllerBase
    {
        private readonly NPAPlanCategoryService _service;
        private readonly CommonFunctions _commonFunctions;

        public NPAPlanCategoryController(NPAPlanCategoryService service, CommonFunctions commonFunctions)
        {
            _service = service;
            _commonFunctions = commonFunctions;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] NPAPlanCategoryDTO dto)
        {
            try
            {
                var result = await _service.CreateAsync(dto);
                if (result != "success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "NPA Plan Category saved successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(Create), nameof(NPAPlanCategoryController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error while saving NPA Plan Category." });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] NPAPlanCategoryDTO dto)
        {
            try
            {
                var result = await _service.UpdateAsync(dto);
                if (result != "success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "NPA Plan Category updated successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(Update), nameof(NPAPlanCategoryController));
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
                return Ok(new ResponseDto { Success = true, Message = "NPA Plan Category deleted successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(Delete), nameof(NPAPlanCategoryController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error deleting NPA Plan Category." });
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
                await _commonFunctions.LogErrors(ex, nameof(GetAll), nameof(NPAPlanCategoryController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error fetching NPA Plan Categories." });
            }
        }

        [HttpGet("groups/{branchId}")]
        public async Task<IActionResult> GetGroups(int branchId)
        {
            var items = await _service.GetGroupsAsync(branchId);
            return Ok(new { Success = true, items });
        }
    }
}
