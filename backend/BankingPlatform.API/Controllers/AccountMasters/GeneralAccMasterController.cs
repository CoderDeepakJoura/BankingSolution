using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountMasters;
using BankingPlatform.API.DTO.Member;
using BankingPlatform.API.Service;
using BankingPlatform.API.Service.AccountMasters;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.AccountMasters
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class GeneralAccMasterController : ControllerBase
    {
        private readonly GeneralAccountMasterService _service;
        public ILogger<GeneralAccMasterController> _logger;

        public GeneralAccMasterController(GeneralAccountMasterService service, ILogger<GeneralAccMasterController> logger)
        {
            _service = service;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> CreateGeneralAccount([FromBody] CommonAccMasterDTO dto)
        {
            try
            {
                var result = await _service.CreateNewGeneralAccAsync(dto);
                if (result != "Success")
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = result
                    });
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "General Account added successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while deleting General Account.");

                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while adding General Account. Please try again later."
                });
            }
        }
        [HttpPost("get_all_general_accounts/{branchId}")]
        public async Task<IActionResult> GetAllGeneralAccounts([FromRoute] int branchId, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var result = await _service.GetAllGeneralAccountsAsync(branchId, filter);

                return Ok(new
                {
                    Success = true,
                    Accounts = result.Items,
                    TotalCount = result.TotalCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching General Accounts");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "Unexpected error while fetching General Accounts"
                });
            }
        }


        [HttpPut]
        public async Task<IActionResult> UpdateGeneralAccount([FromBody] CommonAccMasterDTO dto)
        {
            try
            {
                var result = await _service.UpdateGeneralAccountAsync(dto);
                if (result != "Success") return NotFound(new { Success = false, Message = result });
                return Ok(new { Success = true, message = "Member updated successfully" });
            }
            catch(Exception ex)
            {
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpDelete("{id}/{branchId}")]
        public async Task<IActionResult> DeleteGeneralAccount(int id, int branchId)
        {
            try
            {
                var result = await _service.DeleteAccountMasterAsync(id, branchId);
                if (result is not "Success") return NotFound(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while deleting General Account."
                });
                return Ok(new ResponseDto { Success = true, Message = "General Account deleted successfully." });
            }
            catch (Exception ex)
            {
                // Log exception for debugging (e.g., Serilog, NLog, built-in ILogger)
                _logger.LogError(ex, "Error occurred while deleting General Account.");

                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while deleting the General Account."
                });
            }
        }

    }
}
