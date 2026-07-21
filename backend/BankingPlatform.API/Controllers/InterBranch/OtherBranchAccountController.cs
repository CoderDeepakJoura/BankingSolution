using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Miscalleneous;
using BankingPlatform.API.Service.InterBranch;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class OtherBranchAccountController : ControllerBase
    {
        private readonly OtherBranchAccountService _service;
        private readonly ILogger<OtherBranchAccountController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public OtherBranchAccountController(
            OtherBranchAccountService service,
            ILogger<OtherBranchAccountController> logger,
            CommonFunctions commonFunctions)
        {
            _service         = service;
            _logger          = logger;
            _commonFunctions = commonFunctions;
        }

        [HttpGet("{branchId}")]
        public async Task<IActionResult> GetAll([FromRoute] int branchId)
        {
            try
            {
                var items = await _service.GetAllAsync(branchId);
                return Ok(new { Success = true, Data = items });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching other branch accounts.");
                await _commonFunctions.LogErrors(ex, nameof(GetAll), nameof(OtherBranchAccountController));
                return BadRequest(new ResponseDto { Success = false, Message = "Failed to fetch records." });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] OtherBranchAccountDTO dto)
        {
            try
            {
                var result = await _service.CreateAsync(dto);
                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "Other branch account added successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating other branch account.");
                await _commonFunctions.LogErrors(ex, nameof(Create), nameof(OtherBranchAccountController));
                return BadRequest(new ResponseDto { Success = false, Message = "Failed to add record." });
            }
        }

        [HttpPut]
        public async Task<IActionResult> Update([FromBody] OtherBranchAccountDTO dto)
        {
            try
            {
                var result = await _service.UpdateAsync(dto);
                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "Other branch account updated successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating other branch account.");
                await _commonFunctions.LogErrors(ex, nameof(Update), nameof(OtherBranchAccountController));
                return BadRequest(new ResponseDto { Success = false, Message = "Failed to update record." });
            }
        }

        [HttpDelete("{id}/{branchId}")]
        public async Task<IActionResult> Delete([FromRoute] int id, [FromRoute] int branchId)
        {
            try
            {
                var result = await _service.DeleteAsync(id, branchId);
                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "Other branch account deleted successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting other branch account.");
                await _commonFunctions.LogErrors(ex, nameof(Delete), nameof(OtherBranchAccountController));
                return BadRequest(new ResponseDto { Success = false, Message = "Failed to delete record." });
            }
        }
    }
}
