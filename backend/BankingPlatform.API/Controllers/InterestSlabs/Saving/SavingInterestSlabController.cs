
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.InterestSlabs.Saving;
using BankingPlatform.API.Service;
using BankingPlatform.API.Service.InterestSlabs.Saving;
using BankingPlatform.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.InterestSlabs.Saving
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class SavingInterestSlabController : ControllerBase
    {
        private readonly SavingInterestSlabService _service;
        private readonly CommonFunctions _commonfunctions;
        public SavingInterestSlabController(SavingInterestSlabService service, CommonFunctions commonfunctions)
        {
            _service = service;
            _commonfunctions = commonfunctions;
        }

        [HttpPost]
        public async Task<IActionResult> CreateInterestSlab([FromBody] CombinedSavingIntDTO combinedSavingDTO)
        {
            try
            {
                var result = await _service.CreateInterestSlabAsync(combinedSavingDTO);

                if (result != "success")
                {
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = result
                    });
                }

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Saving Interest Slab saved successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(CreateInterestSlab), nameof(SavingInterestSlabController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occurred while adding Saving Interest Slab."
                });
            }
        }

        /// <summary>
        /// Get all Saving Interest Slabs for a specific branch with pagination and search
        /// </summary>
        /// <param name="branchId">Branch identifier</param>
        /// <param name="filter">Filter containing search term, page number, and page size</param>
        /// <returns>List of savings slabs with pagination info</returns>
        [HttpPost("get-all-slabs/{branchId}")]
        public async Task<IActionResult> GetAllSavingInterestSlabs([FromRoute] int branchId, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var result = await _service.GetAllsavingInterestSlabsAsync(branchId, filter);

                return Ok(new
                {
                    Success = true,
                    SavingInterestSlabs = result.Items,
                    TotalCount = result.TotalCount
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetAllSavingInterestSlabs), nameof(SavingInterestSlabController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching Saving InterestSlabs. Please try again later."
                });
            }
        }

        /// <summary>
        /// Get a specific Saving Interest Slab by ID with all related data
        /// </summary>
        /// <param name="id">Interest Slab ID</param>
        /// <param name="branchId">Branch ID</param>
        /// <returns>Complete product information or NotFound</returns>
        [HttpGet("get-slab-info/{id}/{branchId}")]
        public async Task<IActionResult> GetSavingInterestSlabById(int id, int branchId)
        {
            try
            {
                var result = await _service.GetsavingInterestSlabByIdAsync(id, branchId);

                if (result == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Saving Interest Slab not found."
                    });
                }

                return Ok(new
                {
                    Success = true,
                    Data = result
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetSavingInterestSlabById), nameof(SavingInterestSlabController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching Saving Interest Slab details."
                });
            }
        }

        /// <summary>
        /// Update an existing Saving Interest Slab
        /// </summary>
        /// <param name="productId">Interest Slab ID from route</param>
        /// <param name="combinedSavingDTO">Updated product data</param>
        /// <returns>Success or error response</returns>
        [HttpPut("{productId}")]
        public async Task<IActionResult> UpdateSavingInterestSlab(
            [FromRoute] int productId,
            [FromBody] CombinedSavingIntDTO combinedSavingDTO)
        {
            try
            {
                // Ensure the route productId matches the DTO Id
                if (combinedSavingDTO.savingInterestSlab != null &&
                    combinedSavingDTO.savingInterestSlab.Id.HasValue &&
                    combinedSavingDTO.savingInterestSlab.Id.Value != productId)
                {
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Interest Slab ID mismatch between route and request body."
                    });
                }

                var result = await _service.ModifyInterestSlabAsync(combinedSavingDTO);

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Saving Interest Slab updated successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(UpdateSavingInterestSlab), nameof(SavingInterestSlabController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        /// <summary>
        /// Delete a Saving Interest Slab and all related configurations
        /// </summary>
        /// <param name="id">Interest Slab ID</param>
        /// <param name="branchId">Branch ID</param>
        /// <returns>Success or error response</returns>
        [HttpDelete("{branchId}/{id}")]
        public async Task<IActionResult> DeleteSavingInterestSlab(int id, int branchId)
        {
            try
            {
                var success = await _service.DeleteInterestSlabAsync(id, branchId);

                if (!success)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Saving Interest Slab not found."
                    });
                }

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Saving Interest Slab deleted successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(DeleteSavingInterestSlab), nameof(SavingInterestSlabController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occurred while deleting Saving Interest Slab."
                });
            }
        }
    }
}
