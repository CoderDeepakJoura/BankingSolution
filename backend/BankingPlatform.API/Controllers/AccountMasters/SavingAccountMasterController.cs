using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountMasters;
using BankingPlatform.API.Service;
using BankingPlatform.API.Service.AccountMasters;
using BankingPlatform.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace BankingPlatform.API.Controllers.AccountMasters
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class SavingAccountMasterController : ControllerBase
    {
        private readonly SavingAccountService _service;
        private readonly CommonFunctions _commonfunctions;
        private readonly ImageService _imageService;
        public SavingAccountMasterController(SavingAccountService service, CommonFunctions commonfunctions, ImageService imageService)
        {
            _service = service;
            _commonfunctions = commonfunctions;
            _imageService = imageService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateSavingAccount([FromForm] CreateAccountCreationRequest request)
        {
            try
            {
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = true
                };
                var dto = JsonSerializer.Deserialize<CommonAccMasterDTO>(request.AccountData, options);
                var result = await _service.CreateNewSavingAccAsync(
                    dto!,
                    request.Picture,
                    request.Signature
                );
                if (result != "Success") return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Saving Account saved successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(CreateSavingAccount), nameof(SavingAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while adding saving account."
                });
            }
        }
        [HttpPost("get_all_saving-accounts/{branchId}")]
        public async Task<IActionResult> GetAllSavingAccounts([FromRoute] int branchId, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var result = await _service.GetAllSavingAccountsAsync(branchId, filter);

                return Ok(new
                {
                    Success = true,
                    savingaccountInfo = result.Items,
                    TotalCount = result.TotalCount
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetAllSavingAccounts), nameof(SavingAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching Saving Accounts. Please try again later."
                });
            }
        }

        [HttpGet("{id}/{branchId}")]
        public async Task<IActionResult> GetSavingAccountById(int id, int branchId)
        {
            try
            {
                var result = await _service.GetSavingAccountByIdAsync(id, branchId);
                if (result == null) return NotFound();
                return Ok(new
                {
                    Success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetSavingAccountById), nameof(SavingAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while fetching saving accounts."
                });
            }
        }

        [HttpPut]
        public async Task<IActionResult> UpdateSavingAccount([FromForm] CreateAccountCreationRequest request)
        {
            try
            {
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = true
                };
                var dto = JsonSerializer.Deserialize<CommonAccMasterDTO>(request.AccountData, options);


                var result = await _service.UpdateSavingAccountAsync(
                    dto!,
                    request.Picture,
                    request.Signature
                );
                if(result.ToLower() != "success") return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Saving Account updated successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(UpdateSavingAccount), nameof(SavingAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while updating saving account."
                });
            }
        }

        [HttpDelete("{id}/{branchId}/{voucherId}")]
        public async Task<IActionResult> DeleteSavingAccount(int id, int branchId, int voucherId)
        {
            try
            {
                var result = await _service.DeleteSavingAccountAsync(id, branchId, voucherId);
                if (result != "Success") return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new { message = "Saving Account deleted successfully" });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(DeleteSavingAccount), nameof(SavingAccountMasterController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while deleting saving account."
                });
            }
        }

        [AllowAnonymous]
        [HttpGet("savingaccount-images/{fileName}/{type}")]
        public IActionResult GetSavingAccountImage(
            [FromRoute] string fileName,
            [FromRoute] string type)
        {
            var fileData = _imageService.GetImageFile(fileName, "Account_Images", type, "A");
            if (fileData == null)
                return NotFound("Image not found");

            var (bytes, contentType) = fileData!.Value;
            return File(bytes, contentType);
        }
    }
}

