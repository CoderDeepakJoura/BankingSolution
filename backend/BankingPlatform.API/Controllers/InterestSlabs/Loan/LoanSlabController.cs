using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.InterestSlabs.Loan;
using BankingPlatform.API.Service.InterestSlabs.Loan;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.InterestSlabs.Loan
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class LoanSlabController : ControllerBase
    {
        private readonly LoanSlabService _service;
        private readonly CommonFunctions _commonfunctions;

        public LoanSlabController(LoanSlabService service, CommonFunctions commonfunctions)
        {
            _service = service;
            _commonfunctions = commonfunctions;
        }

        [HttpPost]
        public async Task<IActionResult> CreateLoanSlab([FromBody] CombinedLoanSlabDTO dto)
        {
            try
            {
                var result = await _service.CreateLoanSlabAsync(dto);

                if (result != "success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });

                return Ok(new ResponseDto { Success = true, Message = "Loan Slab saved successfully." });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(CreateLoanSlab), nameof(LoanSlabController));
                return BadRequest(new ResponseDto { Success = false, Message = "Some error occurred while adding Loan Slab." });
            }
        }

        [HttpPost("get-all-slabs/{brId}")]
        public async Task<IActionResult> GetAllLoanSlabs([FromRoute] int brId, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var result = await _service.GetAllLoanSlabsAsync(brId, filter);

                return Ok(new
                {
                    Success = true,
                    LoanSlabs = result.Items,
                    TotalCount = result.TotalCount
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetAllLoanSlabs), nameof(LoanSlabController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while fetching Loan Slabs." });
            }
        }

        [HttpGet("get-slab-info/{id}/{brId}")]
        public async Task<IActionResult> GetLoanSlabById(int id, int brId)
        {
            try
            {
                var result = await _service.GetLoanSlabByIdAsync(id, brId);

                if (result == null)
                    return NotFound(new ResponseDto { Success = false, Message = "Loan Slab not found." });

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetLoanSlabById), nameof(LoanSlabController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while fetching Loan Slab details." });
            }
        }

        [HttpPut("{slabId}")]
        public async Task<IActionResult> UpdateLoanSlab([FromRoute] int slabId, [FromBody] CombinedLoanSlabDTO dto)
        {
            try
            {
                if (dto.loanSlab.Id.HasValue && dto.loanSlab.Id.Value != slabId)
                    return BadRequest(new ResponseDto { Success = false, Message = "Slab ID mismatch between route and request body." });

                var result = await _service.ModifyLoanSlabAsync(dto);

                if (result != "success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });

                return Ok(new ResponseDto { Success = true, Message = "Loan Slab updated successfully." });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(UpdateLoanSlab), nameof(LoanSlabController));
                return BadRequest(new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        [HttpDelete("{brId}/{id}")]
        public async Task<IActionResult> DeleteLoanSlab(int id, int brId)
        {
            try
            {
                var success = await _service.DeleteLoanSlabAsync(id, brId);

                if (!success)
                    return NotFound(new ResponseDto { Success = false, Message = "Loan Slab not found." });

                return Ok(new ResponseDto { Success = true, Message = "Loan Slab deleted successfully." });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(DeleteLoanSlab), nameof(LoanSlabController));
                return BadRequest(new ResponseDto { Success = false, Message = "Some error occurred while deleting Loan Slab." });
            }
        }
    }
}
