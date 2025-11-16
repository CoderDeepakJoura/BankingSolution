using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.BranchMaster;
using BankingPlatform.API.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace BankingPlatform.API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class BranchMasterController : ControllerBase
    {
        private readonly BranchMasterService _service;
        private readonly ILogger<BranchMasterController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public BranchMasterController(
            BranchMasterService service,
            ILogger<BranchMasterController> logger,
            CommonFunctions commonFunctions)
        {
            _service = service;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }

        [HttpPost]
        public async Task<IActionResult> CreateBranch([FromBody] BranchMasterDto dto)
        {
            try
            {
                var result = await _service.CreateBranchAsync(dto);
                if (result != "Success")
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = result
                    });

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Branch added successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while adding Branch.");
                await _commonFunctions.LogErrors(ex, nameof(CreateBranch), "BranchMasterController");
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while adding Branch. Please try again later."
                });
            }
        }

        [HttpPost("get_all_branches/{societyId}")]
        public async Task<IActionResult> GetAllBranches([FromRoute] int societyId, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var result = await _service.GetAllBranchesAsync(societyId, filter);

                return Ok(new
                {
                    Success = true,
                    Branches = result.Items,
                    TotalCount = result.TotalCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while fetching Branches.");
                await _commonFunctions.LogErrors(ex, nameof(GetAllBranches), "BranchMasterController");
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching Branches. Please try again later."
                });
            }
        }

        [HttpGet("{branchId}/{societyId}")]
        public async Task<IActionResult> GetBranchById(int branchId, int societyId)
        {
            try
            {
                var result = await _service.GetBranchByIdAsync(branchId, societyId);
                if (result == null)
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Branch not found."
                    });

                return Ok(new
                {
                    Success = true,
                    Branch = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while fetching Branch.");
                await _commonFunctions.LogErrors(ex, nameof(GetBranchById), "BranchMasterController");
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching Branch. Please try again later."
                });
            }
        }

        [HttpPut]
        public async Task<IActionResult> UpdateBranch([FromBody] BranchMasterDto dto)
        {
            try
            {
                var result = await _service.UpdateBranchAsync(dto);
                if (result != "Success")
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = result
                    });

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Branch updated successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while updating Branch.");
                await _commonFunctions.LogErrors(ex, nameof(UpdateBranch), "BranchMasterController");
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while updating Branch. Please try again later."
                });
            }
        }

        [HttpDelete("{branchId}/{societyId}")]
        public async Task<IActionResult> DeleteBranch(int branchId, int societyId)
        {
            try
            {
                var result = await _service.DeleteBranchAsync(branchId, societyId);
                if (result != "Success")
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Some error occurred while deleting Branch."
                    });

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Branch deleted successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while deleting Branch.");
                await _commonFunctions.LogErrors(ex, nameof(DeleteBranch), "BranchMasterController");
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while deleting the Branch."
                });
            }
        }
    }
}
