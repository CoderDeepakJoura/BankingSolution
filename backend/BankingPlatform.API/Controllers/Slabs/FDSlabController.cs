using BankingPlatform.API.Controllers.InterestSlabs.FD;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.InterestSlabs.FD;
using BankingPlatform.API.Service.InterestSlabs.FD;
using BankingPlatform.API.Service.Slabs.FD;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Slabs
{
    [Route("api/[controller]")]
    [ApiController]
    public class FDSlabController : ControllerBase
    {
        private readonly FDSlabService _service;
        private readonly CommonFunctions _commonfunctions;
        public FDSlabController(FDSlabService service, CommonFunctions commonfunctions)
        {
            _service = service;
            _commonfunctions = commonfunctions;
        }
        [HttpPost]
        public async Task<IActionResult> CreateFDInterestSlab([FromBody] CombinedFDIntDTO combinedFDDTO)
        {
            try
            {
                var result = await _service.CreateInterestSlabAsync(combinedFDDTO);

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
                    Message = "FD Interest Slab saved successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(FDSlabController), nameof(FDInterestSlabController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occurred while adding FD Interest Slab."
                });
            }
        }

        [HttpPost("get-all-slabs/{branchId}")]
        public async Task<IActionResult> GetAllFDInterestSlabs([FromRoute] int branchId, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var result = await _service.GetAllFDInterestSlabsAsync(branchId, filter);

                return Ok(new
                {
                    Success = true,
                    FDInterestSlabs = result.Items,
                    TotalCount = result.TotalCount
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetAllFDInterestSlabs), nameof(FDInterestSlabController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching FD Interest Slabs. Please try again later."
                });
            }
        }

        /// <summary>
        /// Get a specific FD Interest Slab by ID with all related data
        /// </summary>
        /// <param name="id">Interest Slab ID</param>
        /// <param name="branchId">Branch ID</param>
        /// <returns>Complete product information or NotFound</returns>
        [HttpGet("get-slab-info/{id}/{branchId}")]
        public async Task<IActionResult> GetFDInterestSlabById(int id, int branchId)
        {
            try
            {
                var result = await _service.GetFDInterestSlabByIdAsync(id, branchId);

                if (result == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "FD Interest Slab not found."
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
                await _commonfunctions.LogErrors(ex, nameof(GetFDInterestSlabById), nameof(FDInterestSlabController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching FD Interest Slab details."
                });
            }
        }
        [HttpPut("{productId}")]
        public async Task<IActionResult> UpdateFDInterestSlab(
            [FromRoute] int productId,
            [FromBody] CombinedFDIntDTO combinedFDDTO)
        {
            try
            {
                // Ensure the route productId matches the DTO Id
                if (combinedFDDTO.FDInterestSlab != null &&
                    combinedFDDTO.FDInterestSlab.Id.HasValue &&
                    combinedFDDTO.FDInterestSlab.Id.Value != productId)
                {
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Interest Slab ID mismatch between route and request body."
                    });
                }

                var result = await _service.ModifyInterestSlabAsync(combinedFDDTO);
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
                    Message = "FD Interest Slab updated successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(UpdateFDInterestSlab), nameof(FDInterestSlabController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        /// <summary>
        /// Delete a FD Interest Slab and all related configurations
        /// </summary>
        /// <param name="id">Interest Slab ID</param>
        /// <param name="branchId">Branch ID</param>
        /// <returns>Success or error response</returns>
        [HttpDelete("{branchId}/{id}")]
        public async Task<IActionResult> DeleteFDInterestSlab(int id, int branchId)
        {
            try
            {
                var success = await _service.DeleteInterestSlabAsync(id, branchId);

                if (!success)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "FD Interest Slab not found."
                    });
                }

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "FD Interest Slab deleted successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(DeleteFDInterestSlab), nameof(FDInterestSlabController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occurred while deleting FD Interest Slab."
                });
            }
        }
    }
}
