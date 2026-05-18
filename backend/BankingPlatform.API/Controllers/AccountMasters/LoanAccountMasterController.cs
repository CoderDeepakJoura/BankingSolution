using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountMasters.Loan;
using BankingPlatform.API.Service.AccountMasters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.AccountMasters
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class LoanAccountMasterController : ControllerBase
    {
        private readonly LoanAccountService _service;
        private readonly ILogger<LoanAccountMasterController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public LoanAccountMasterController(LoanAccountService service, ILogger<LoanAccountMasterController> logger, CommonFunctions commonFunctions)
        {
            _service = service;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }

        [HttpPost]
        public async Task<IActionResult> CreateLoanAccount([FromBody] CombinedLoanAccountDTO dto)
        {
            try
            {
                if (dto?.AccountMasterDTO == null)
                    return BadRequest(new ResponseDto { Success = false, Message = "Invalid request data." });

                (var result, int accountId) = await _service.CreateLoanAccountAsync(dto);

                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });

                return Ok(new ResponseDto { Success = true, Message = $"Loan account created successfully. Account ID: {accountId}" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating loan account.");
                await _commonFunctions.LogErrors(ex, nameof(CreateLoanAccount), nameof(LoanAccountMasterController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while creating the loan account." });
            }
        }

        [HttpGet("{accountId}/{brId}")]
        public async Task<IActionResult> GetLoanAccountById(int accountId, int brId)
        {
            try
            {
                var result = await _service.GetLoanAccountByIdAsync(accountId, brId);
                if (result == null)
                    return NotFound(new ResponseDto { Success = false, Message = "Loan account not found." });

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(GetLoanAccountById), nameof(LoanAccountMasterController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while fetching loan account." });
            }
        }

        [HttpGet("product-info/{productId}/{brId}")]
        public async Task<IActionResult> GetLoanProductInfo(int productId, int brId)
        {
            try
            {
                var result = await _service.GetLoanProductInfoAsync(productId, brId);
                if (result == null)
                    return NotFound(new ResponseDto { Success = false, Message = "Loan product not found." });

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(GetLoanProductInfo), nameof(LoanAccountMasterController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred." });
            }
        }

        [HttpGet("list/{brId}")]
        public async Task<IActionResult> GetLoanAccounts(int brId, [FromQuery] string? searchTerm, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var (data, total) = await _service.GetLoanAccountsAsync(brId, searchTerm, pageNumber, pageSize);
                return Ok(new { Success = true, Data = data, TotalCount = total });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(GetLoanAccounts), nameof(LoanAccountMasterController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while fetching loan accounts." });
            }
        }

        [HttpPost("calculate-schedule")]
        public IActionResult CalculateSchedule([FromBody] CalculateScheduleRequestDTO req)
        {
            try
            {
                if (req == null || req.LoanAmount <= 0 || req.LoanPeriod <= 0 || req.KistInterval <= 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "Invalid schedule parameters." });

                var result = _service.CalculateSchedule(req);
                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating schedule.");
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while calculating the schedule." });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateLoanAccount(int id, [FromBody] CombinedLoanAccountDTO dto)
        {
            try
            {
                if (dto?.AccountMasterDTO == null)
                    return BadRequest(new ResponseDto { Success = false, Message = "Invalid request data." });

                var result = await _service.UpdateLoanAccountAsync(id, dto);
                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });

                return Ok(new ResponseDto { Success = true, Message = "Loan account updated successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(UpdateLoanAccount), nameof(LoanAccountMasterController));
                return BadRequest(new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        [HttpDelete("{id}/{brId}")]
        public async Task<IActionResult> DeleteLoanAccount(int id, int brId)
        {
            try
            {
                var result = await _service.DeleteLoanAccountAsync(id, brId);
                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "Loan account deleted successfully" });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(DeleteLoanAccount), nameof(LoanAccountMasterController));
                return BadRequest(new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        [HttpGet("next-account-number/{productId}/{brId}")]
        public async Task<IActionResult> GetNextAccountNumber(int productId, int brId)
        {
            try
            {
                var number = await _service.GetNextLoanAccountNumber(productId, brId);
                return Ok(new { Success = true, Data = number });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(GetNextAccountNumber), nameof(LoanAccountMasterController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred." });
            }
        }
    }
}
