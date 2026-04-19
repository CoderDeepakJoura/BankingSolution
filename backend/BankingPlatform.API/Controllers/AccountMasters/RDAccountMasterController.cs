using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountMasters;
using BankingPlatform.API.Service.AccountMasters;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.AccountMasters
{
    [Route("api/[controller]")]
    [Authorize]
    [ApiController]
    public class RDAccountMasterController : ControllerBase
    {
        private readonly RDAccountService _service;
        private readonly CommonFunctions _commonfunctions;
        public RDAccountMasterController(RDAccountService service, CommonFunctions commonfunctions)
        {
            _service = service;
            _commonfunctions = commonfunctions;
        }

        [HttpPost]
        public async Task<IActionResult> CreateRDAccount([FromBody] CommonAccMasterDTO dto)
        {
            try
            {
                var result = await _service.CreateNewRDAccAsync(
                    dto!
                );
                if (result != "Success") return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "RD Account saved successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(CreateRDAccount), nameof(RDAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while adding rd account."
                });
            }
        }
        [HttpPost("get_all_rd-accounts/{branchId}")]
        public async Task<IActionResult> GetAllRDAccounts([FromRoute] int branchId, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var result = await _service.GetAllRDAccountsAsync(branchId, filter);

                return Ok(new
                {
                    Success = true,
                    rdaccountInfo = result.Items,
                    TotalCount = result.TotalCount
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetAllRDAccounts), nameof(RDAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching RD Accounts. Please try again later."
                });
            }
        }

        [HttpGet("{id}/{branchId}/{currentDate?}")]
        public async Task<IActionResult> GetRDAccountById(int id, int branchId, string? currentDate)
        {
            try
            {
                var result = !string.IsNullOrEmpty(currentDate) ? await _service.GetRDAccountMatureOrPreMatureDetailByIdAsync(id, branchId, Convert.ToDateTime(currentDate)) : await _service.GetRDAccountByIdAsync(id, branchId);
                if (result == null) return NotFound();
                return Ok(new
                {
                    Success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetRDAccountById), nameof(RDAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while fetching rd accounts."
                });
            }
        }

        [HttpPut]
        public async Task<IActionResult> UpdateRDAccount([FromBody] CommonAccMasterDTO dto)
        {
            try
            {

                var result = await _service.UpdateRDAccountAsync(
                    dto!
                );
                if (result.ToLower() != "success") return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "RD Account updated successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(UpdateRDAccount), nameof(RDAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while updating rd account."
                });
            }
        }

        [HttpDelete("{id}/{branchId}")]
        public async Task<IActionResult> DeleteRDAccount(int id, int branchId)
        {
            try
            {
                var result = await _service.DeleteRDAccountAsync(id, branchId);
                if (result != "Success") return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new { message = "RD Account deleted successfully" });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(DeleteRDAccount), nameof(RDAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while deleting rd account."
                });
            }
        }

        [HttpPost("mature-rd")]
        public async Task<IActionResult> MatureRD([FromBody] CommonAccMasterDTO dto)
        {
            try
            {

                var result = await _service.MatureRDAsync(
                    dto!
                );
                if (result.ToLower() != "success") return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "RD Account matured successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(MatureRD), nameof(RDAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured."
                });
            }
        }

        [HttpPost("premature-rd")]
        public async Task<IActionResult> PreMatureRD([FromBody] CommonAccMasterDTO dto)
        {
            try
            {

                var result = await _service.PreMatureRDAsync(
                    dto!
                );
                if (result.ToLower() != "success") return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "RD Account pre-matured successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(PreMatureRD), nameof(RDAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while pre-maturing rd account."
                });
            }
        }
    }
}
