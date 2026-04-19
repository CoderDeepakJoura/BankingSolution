using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountMasters;
using BankingPlatform.API.Service;
using BankingPlatform.API.Service.AccountMasters;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace BankingPlatform.API.Controllers.AccountMasters
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class FDAccountMasterController : ControllerBase
    {
        private readonly FDAccountService _service;
        private readonly CommonFunctions _commonfunctions;
        public FDAccountMasterController(FDAccountService service, CommonFunctions commonfunctions)
        {
            _service = service;
            _commonfunctions = commonfunctions;
        }

        [HttpPost]
        public async Task<IActionResult> CreateFDAccount([FromBody] CommonAccMasterDTO dto)
        {
            try
            {
                var result = await _service.CreateNewFDAccAsync(
                    dto!
                );
                if (result != "Success") return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "FD Account saved successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(CreateFDAccount), nameof(FDAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while adding fd account."
                });
            }
        }
        [HttpPost("get_all_fd-accounts/{branchId}")]
        public async Task<IActionResult> GetAllFDAccounts([FromRoute] int branchId, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var result = await _service.GetAllFDAccountsAsync(branchId, filter);

                return Ok(new
                {
                    Success = true,
                    fdaccountInfo = result.Items,
                    TotalCount = result.TotalCount
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetAllFDAccounts), nameof(FDAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching FD Accounts. Please try again later."
                });
            }
        }

        [HttpGet("{id}/{branchId}/{currentDate?}")]
        public async Task<IActionResult> GetFDAccountById(int id, int branchId, string? currentDate)
        {
            try
            {
                var result = !string.IsNullOrEmpty(currentDate) ?  await _service.GetFDAccountMatureOrPreMatureDetailByIdAsync(id, branchId, Convert.ToDateTime(currentDate)) : await _service.GetFDAccountByIdAsync(id, branchId);
                if (result == null) return NotFound();
                return Ok(new
                {
                    Success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetFDAccountById), nameof(FDAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while fetching fd accounts."
                });
            }
        }

        [HttpPut]
        public async Task<IActionResult> UpdateFDAccount([FromBody] CommonAccMasterDTO dto)
        {
            try
            {

                var result = await _service.UpdateFDAccountAsync(
                    dto!
                );
                if (result.ToLower() != "success") return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "FD Account updated successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(UpdateFDAccount), nameof(FDAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while updating fd account."
                });
            }
        }

        [HttpDelete("{id}/{branchId}")]
        public async Task<IActionResult> DeleteFDAccount(int id, int branchId)
        {
            try
            {
                var result = await _service.DeleteFDAccountAsync(id, branchId);
                if (result != "Success") return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new { message = "FD Account deleted successfully" });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(DeleteFDAccount), nameof(FDAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while deleting fd account."
                });
            }
        }

        [HttpPost("mature-or-renew-fd")]
        public async Task<IActionResult> MatureFD([FromBody] CommonAccMasterDTO dto)
        {
            try
            {

                var result = await _service.MatureOrRenewFDAsync(
                    dto!
                );
                if (result.ToLower() != "success") return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "FD Account" + (dto.MatureOrRenewFDInfo!.IsRenew ? "renewed" : "matured") + " successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(MatureFD), nameof(FDAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured."
                });
            }
        }

        [HttpPost("premature-fd")]
        public async Task<IActionResult> PreMatureFD([FromBody] CommonAccMasterDTO dto)
        {
            try
            {

                var result = await _service.PreMatureFDAsync(
                    dto!
                );
                if (result.ToLower() != "success") return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "FD Account pre-matured successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(PreMatureFD), nameof(FDAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while pre-maturing fd account."
                });
            }
        }
    }
}
