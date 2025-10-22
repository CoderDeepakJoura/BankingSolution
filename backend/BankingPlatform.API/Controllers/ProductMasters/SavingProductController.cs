// BankingPlatform.API.Controllers.ProductMasters/SavingsProductController.cs
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.ProductMasters.Saving;
using BankingPlatform.API.Service.ProductMasters.Savings;
using BankingPlatform.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.ProductMasters
{
    [Route("api/[controller]")]
    [ApiController]
    public class SavingsProductController : ControllerBase
    {
        private readonly SavingsProductService _service;
        private readonly CommonFunctions _commonfunctions;

        public SavingsProductController(SavingsProductService service, CommonFunctions commonfunctions)
        {
            _service = service;
            _commonfunctions = commonfunctions;
        }

        /// <summary>
        /// Create a new Savings Product with all related configurations
        /// </summary>
        /// <param name="combinedSavingsDTO">Combined DTO containing product, rules, posting heads, and interest rules</param>
        /// <returns>Success or error response</returns>
        [HttpPost]
        public async Task<IActionResult> CreateProduct([FromBody] CombinedSavingDTO combinedSavingsDTO)
        {
            try
            {
                var result = await _service.CreateProductAsync(combinedSavingsDTO);

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
                    Message = "Savings Product saved successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(CreateProduct), nameof(SavingsProductController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occurred while adding Savings Product."
                });
            }
        }

        /// <summary>
        /// Get all Savings Products for a specific branch with pagination and search
        /// </summary>
        /// <param name="branchId">Branch identifier</param>
        /// <param name="filter">Filter containing search term, page number, and page size</param>
        /// <returns>List of savings products with pagination info</returns>
        [HttpPost("get-all-products/{branchId}")]
        public async Task<IActionResult> GetAllSavingsProducts([FromRoute] int branchId, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var result = await _service.GetAllSavingsProductsAsync(branchId, filter);

                return Ok(new
                {
                    Success = true,
                    SavingsProducts = result.Items,
                    TotalCount = result.TotalCount
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetAllSavingsProducts), nameof(SavingsProductController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching Savings Products. Please try again later."
                });
            }
        }

        /// <summary>
        /// Get a specific Savings Product by ID with all related data
        /// </summary>
        /// <param name="id">Product ID</param>
        /// <param name="branchId">Branch ID</param>
        /// <returns>Complete product information or NotFound</returns>
        [HttpGet("get-product-info/{id}/{branchId}")]
        public async Task<IActionResult> GetSavingsProductById(int id, int branchId)
        {
            try
            {
                var result = await _service.GetSavingsProductByIdAsync(id, branchId);

                if (result == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Savings Product not found."
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
                await _commonfunctions.LogErrors(ex, nameof(GetSavingsProductById), nameof(SavingsProductController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching Savings Product details."
                });
            }
        }

        /// <summary>
        /// Update an existing Savings Product
        /// </summary>
        /// <param name="productId">Product ID from route</param>
        /// <param name="combinedSavingsDTO">Updated product data</param>
        /// <returns>Success or error response</returns>
        [HttpPut("{productId}")]
        public async Task<IActionResult> UpdateSavingsProduct(
            [FromRoute] int productId,
            [FromBody] CombinedSavingDTO combinedSavingsDTO)
        {
            try
            {
                // Ensure the route productId matches the DTO Id
                if (combinedSavingsDTO.SavingsProductDTO != null &&
                    combinedSavingsDTO.SavingsProductDTO.Id.HasValue &&
                    combinedSavingsDTO.SavingsProductDTO.Id.Value != productId)
                {
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Product ID mismatch between route and request body."
                    });
                }

                var result = await _service.ModifyProductAsync(combinedSavingsDTO);

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Savings Product updated successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(UpdateSavingsProduct), nameof(SavingsProductController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        /// <summary>
        /// Delete a Savings Product and all related configurations
        /// </summary>
        /// <param name="id">Product ID</param>
        /// <param name="branchId">Branch ID</param>
        /// <returns>Success or error response</returns>
        [HttpDelete("{branchId}/{id}")]
        public async Task<IActionResult> DeleteSavingsProduct(int id, int branchId)
        {
            try
            {
                var success = await _service.DeleteProductAsync(id, branchId);

                if (!success)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Savings Product not found."
                    });
                }

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Savings Product deleted successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(DeleteSavingsProduct), nameof(SavingsProductController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occurred while deleting Savings Product."
                });
            }
        }

        /// <summary>
        /// Get all active Savings Products for a branch (no pagination)
        /// </summary>
        /// <param name="branchId">Branch ID</param>
        /// <returns>List of active savings products</returns>
        [HttpGet("active/{branchId}")]
        public async Task<IActionResult> GetActiveSavingsProducts(int branchId)
        {
            try
            {
                var filter = new LocationFilterDTO
                {
                    PageNumber = 1,
                    PageSize = int.MaxValue,
                    SearchTerm = ""
                };

                var result = await _service.GetAllSavingsProductsAsync(branchId, filter);
                return Ok(new
                {
                    Success = true,
                    SavingsProducts = result
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetActiveSavingsProducts), nameof(SavingsProductController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching active Savings Products."
                });
            }
        }
    }
}
