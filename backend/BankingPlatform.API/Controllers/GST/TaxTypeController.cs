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
    public class TaxTypeController : ControllerBase
    {
        private readonly TaxTypeService _service;
        private readonly CommonFunctions _commonFunctions;

        public TaxTypeController(TaxTypeService service, CommonFunctions commonFunctions)
        {
            _service = service;
            _commonFunctions = commonFunctions;
        }

        [HttpGet("accounts/{branchId}")]
        public async Task<IActionResult> GetAccountList(int branchId)
        {
            var items = await _service.GetAccountListAsync(branchId);
            return Ok(new { Success = true, items });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TaxTypeDTO dto)
        {
            try
            {
                var result = await _service.CreateAsync(dto);
                if (result != "success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "Tax Type saved successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(Create), nameof(TaxTypeController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error while saving Tax Type." });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] TaxTypeDTO dto)
        {
            try
            {
                var result = await _service.UpdateAsync(dto);
                if (result != "success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "Tax Type updated successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(Update), nameof(TaxTypeController));
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
                return Ok(new ResponseDto { Success = true, Message = "Tax Type deleted successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(Delete), nameof(TaxTypeController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error deleting Tax Type." });
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
                await _commonFunctions.LogErrors(ex, nameof(GetAll), nameof(TaxTypeController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error fetching Tax Types." });
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
