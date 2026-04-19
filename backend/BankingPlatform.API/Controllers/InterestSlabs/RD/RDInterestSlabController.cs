using BankingPlatform.API.Controllers.InterestSlabs.RD;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.InterestSlabs.RD;
using BankingPlatform.API.Service.InterestSlabs.RD;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.InterestSlabs.RD
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class RDInterestSlabController : ControllerBase
    {
        private readonly RDInterestSlabService _service;
        private readonly CommonFunctions _commonfunctions;
        public RDInterestSlabController(RDInterestSlabService service, CommonFunctions commonfunctions)
        {
            _service = service;
            _commonfunctions = commonfunctions;
        }

        [HttpPost]
        public async Task<IActionResult> CreateInterestSlab([FromBody] CombinedRDIntDTO combinedRDDTO)
        {
            try
            {
                var result = await _service.CreateInterestSlabAsync(combinedRDDTO);

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
                    Message = "RD Interest Slab saved successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(CreateInterestSlab), nameof(RDInterestSlabController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occurred while adding RD Interest Slab."
                });
            }
        }

        /// <summary>
        /// Get all RD Interest Slabs for a specific branch with pagination and search
        /// </summary>
        /// <param name="branchId">Branch identifier</param>
        /// <param name="filter">Filter containing search term, page number, and page size</param>
        /// <returns>List of rds slabs with pagination info</returns>
        [HttpPost("get-all-slabs/{branchId}")]
        public async Task<IActionResult> GetAllRDInterestSlabs([FromRoute] int branchId, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var result = await _service.GetAllRDInterestSlabsAsync(branchId, filter);

                return Ok(new
                {
                    Success = true,
                    RDInterestSlabs = result.Items,
                    TotalCount = result.TotalCount
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetAllRDInterestSlabs), nameof(RDInterestSlabController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching RD InterestSlabs. Please try again later."
                });
            }
        }

        /// <summary>
        /// Get a specific RD Interest Slab by ID with all related data
        /// </summary>
        /// <param name="id">Interest Slab ID</param>
        /// <param name="branchId">Branch ID</param>
        /// <returns>Complete product information or NotFound</returns>
        [HttpGet("get-slab-info/{id}/{branchId}")]
        public async Task<IActionResult> GetRDInterestSlabById(int id, int branchId)
        {
            try
            {
                var result = await _service.GetRDInterestSlabByIdAsync(id, branchId);

                if (result == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "RD Interest Slab not found."
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
                await _commonfunctions.LogErrors(ex, nameof(GetRDInterestSlabById), nameof(RDInterestSlabController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching RD Interest Slab details."
                });
            }
        }

        /// <summary>
        /// Update an existing RD Interest Slab
        /// </summary>
        /// <param name="productId">Interest Slab ID from route</param>
        /// <param name="combinedRDDTO">Updated product data</param>
        /// <returns>Success or error response</returns>
        [HttpPut("{productId}")]
        public async Task<IActionResult> UpdateRDInterestSlab(
            [FromRoute] int productId,
            [FromBody] CombinedRDIntDTO combinedRDDTO)
        {
            try
            {
                // Ensure the route productId matches the DTO Id
                if (combinedRDDTO.rdInterestSlab != null &&
                    combinedRDDTO.rdInterestSlab.Id.HasValue &&
                    combinedRDDTO.rdInterestSlab.Id.Value != productId)
                {
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Interest Slab ID mismatch between route and request body."
                    });
                }

                var result = await _service.ModifyInterestSlabAsync(combinedRDDTO);

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "RD Interest Slab updated successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(UpdateRDInterestSlab), nameof(RDInterestSlabController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        /// <summary>
        /// Delete a RD Interest Slab and all related configurations
        /// </summary>
        /// <param name="id">Interest Slab ID</param>
        /// <param name="branchId">Branch ID</param>
        /// <returns>Success or error response</returns>
        [HttpDelete("{branchId}/{id}")]
        public async Task<IActionResult> DeleteRDInterestSlab(int id, int branchId)
        {
            try
            {
                var success = await _service.DeleteInterestSlabAsync(id, branchId);

                if (!success)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "RD Interest Slab not found."
                    });
                }

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "RD Interest Slab deleted successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(DeleteRDInterestSlab), nameof(RDInterestSlabController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occurred while deleting RD Interest Slab."
                });
            }
        }
    }

}
