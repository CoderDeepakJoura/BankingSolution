using BankingPlatform.API.Common;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.GST;
using BankingPlatform.API.Service.GST;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.GST
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class TaxGroupController : ControllerBase
    {
        private readonly TaxGroupService _service;
        private readonly CommonFunctions _commonFunctions;

        public TaxGroupController(TaxGroupService service, CommonFunctions commonFunctions)
        {
            _service = service;
            _commonFunctions = commonFunctions;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TaxGroupDTO dto)
        {
            try
            {
                var result = await _service.CreateAsync(dto);
                if (result != "success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "Tax Group saved successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(Create), nameof(TaxGroupController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error while saving Tax Group." });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] TaxGroupDTO dto)
        {
            try
            {
                var result = await _service.UpdateAsync(dto);
                if (result != "success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "Tax Group updated successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(Update), nameof(TaxGroupController));
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
                return Ok(new ResponseDto { Success = true, Message = "Tax Group deleted successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(Delete), nameof(TaxGroupController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error deleting Tax Group." });
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
                await _commonFunctions.LogErrors(ex, nameof(GetAll), nameof(TaxGroupController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error fetching Tax Groups." });
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
