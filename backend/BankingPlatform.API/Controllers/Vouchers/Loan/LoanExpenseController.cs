using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Voucher.Loan;
using BankingPlatform.API.Service.Vouchers.Loan;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Vouchers.Loan
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class LoanExpenseController : ControllerBase
    {
        private readonly LoanExpenseService _service;
        private readonly ILogger<LoanExpenseController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public LoanExpenseController(LoanExpenseService service, ILogger<LoanExpenseController> logger, CommonFunctions commonFunctions)
        {
            _service = service;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }

        [HttpGet("service-lookup/{accId}")]
        public async Task<IActionResult> GetServiceLookup(int accId, [FromQuery] int branchId, [FromQuery] DateTime date, [FromQuery] int supplyTypeId)
        {
            try
            {
                if (accId <= 0 || branchId <= 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "Invalid parameters." });

                var result = await _service.GetServiceByAccountAsync(accId, branchId, date, supplyTypeId);
                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching service lookup for account {AccId}.", accId);
                await _commonFunctions.LogErrors(ex, nameof(GetServiceLookup), nameof(LoanExpenseController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while fetching service info." });
            }
        }

        [HttpGet("branch-gst-info")]
        public async Task<IActionResult> GetBranchGstInfo([FromQuery] int branchId)
        {
            try
            {
                var (gstNo, stateId) = await _service.GetBranchGstInfoAsync(branchId);
                return Ok(new { Success = true, Data = new { GstNo = gstNo, StateId = stateId } });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(GetBranchGstInfo), nameof(LoanExpenseController));
                return BadRequest(new ResponseDto { Success = false, Message = "Failed to fetch branch GST info." });
            }
        }

        [HttpGet("bill-books")]
        public async Task<IActionResult> GetBillBooks([FromQuery] int branchId)
        {
            try
            {
                if (branchId <= 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "Branch ID is required." });

                int sessionId = _commonFunctions.GetCurrentSessionId();
                var items = await _service.GetBillBooksAsync(branchId, sessionId);
                return Ok(new { Success = true, Items = items });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching bill books.");
                await _commonFunctions.LogErrors(ex, nameof(GetBillBooks), nameof(LoanExpenseController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while fetching bill books." });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] LoanExpenseDTO dto)
        {
            try
            {
                if (dto == null)
                    return BadRequest(new ResponseDto { Success = false, Message = "Invalid request data." });

                (var result, int voucherNo) = await _service.CreateAsync(dto);

                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });

                return Ok(new { Success = true, Message = "Loan expense voucher created successfully.", Data = new { voucherNo } });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating loan expense voucher.");
                await _commonFunctions.LogErrors(ex, nameof(Create), nameof(LoanExpenseController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while creating the voucher." });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id, [FromQuery] int branchId)
        {
            try
            {
                if (id <= 0 || branchId <= 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "Invalid parameters." });

                var item = await _service.GetByIdAsync(id, branchId);
                if (item == null)
                    return NotFound(new ResponseDto { Success = false, Message = "Record not found." });

                return Ok(new { Success = true, Data = item });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(GetById), nameof(LoanExpenseController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred." });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] LoanExpenseDTO dto)
        {
            try
            {
                if (dto == null || id <= 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "Invalid request data." });

                (var result, int voucherNo) = await _service.UpdateAsync(id, dto);

                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });

                return Ok(new { Success = true, Message = "Loan expense updated successfully.", Data = new { voucherNo } });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating loan expense {Id}.", id);
                await _commonFunctions.LogErrors(ex, nameof(Update), nameof(LoanExpenseController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while updating." });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int branchId, [FromQuery] LocationFilterDTO filter, [FromQuery] DateTime? date = null)
        {
            try
            {
                if (branchId <= 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "Branch ID is required." });

                filter ??= new LocationFilterDTO();
                (var items, int total) = await _service.GetAllAsync(branchId, filter, date);
                return Ok(new { Success = true, Items = items, TotalCount = total });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching loan expense list.");
                await _commonFunctions.LogErrors(ex, nameof(GetAll), nameof(LoanExpenseController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while fetching the list." });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id, [FromQuery] int branchId)
        {
            try
            {
                if (id <= 0 || branchId <= 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "Invalid parameters." });

                var deleted = await _service.DeleteAsync(id, branchId);

                if (!deleted)
                    return NotFound(new ResponseDto { Success = false, Message = "Loan expense record not found." });

                return Ok(new ResponseDto { Success = true, Message = "Loan expense deleted successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting loan expense {Id}.", id);
                await _commonFunctions.LogErrors(ex, nameof(Delete), nameof(LoanExpenseController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while deleting." });
            }
        }
    }
}
