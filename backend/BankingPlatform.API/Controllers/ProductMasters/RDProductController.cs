using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.ProductMasters.RD;
using BankingPlatform.API.Service.ProductMasters.RD;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.ProductMasters
{
    [Route("api/[controller]")]
    [ApiController]
    public class RDProductController : ControllerBase
    {
        private readonly RDProductService _service;
        private readonly CommonFunctions _commonfunctions;

        public RDProductController(RDProductService service, CommonFunctions commonfunctions)
        {
            _service = service;
            _commonfunctions = commonfunctions;
        }

        // POST api/rdproduct
        [HttpPost]
        public async Task<IActionResult> CreateProduct([FromBody] CombinedRDProductDTO combinedRDDTO)
        {
            try
            {
                var result = await _service.CreateProductAsync(combinedRDDTO);

                if (result != "success")
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = result
                    });

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "RD Product saved successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(CreateProduct), nameof(RDProductController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occurred while adding RD Product."
                });
            }
        }

        // POST api/rdproduct/get-all-products/{branchId}
        [HttpPost("get-all-products/{branchId}")]
        public async Task<IActionResult> GetAllRDProducts([FromRoute] int branchId, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var result = await _service.GetAllRDProductsAsync(branchId, filter);

                return Ok(new
                {
                    Success = true,
                    rdProducts = result.Items,
                    TotalCount = result.TotalCount
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetAllRDProducts), nameof(RDProductController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching RD Products. Please try again later."
                });
            }
        }

        // GET api/rdproduct/get-product-info/{id}/{branchId}
        [HttpGet("get-product-info/{id}/{branchId}")]
        public async Task<IActionResult> GetRDProductById(int id, int branchId)
        {
            try
            {
                var result = await _service.GetRDProductByIdAsync(id, branchId);

                if (result == null)
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "RD Product not found."
                    });

                return Ok(new
                {
                    Success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetRDProductById), nameof(RDProductController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching RD Product."
                });
            }
        }

        // PUT api/rdproduct/{productId}
        [HttpPut("{productId}")]
        public async Task<IActionResult> UpdateRDProduct([FromRoute] int productId, [FromBody] CombinedRDProductDTO combinedRDDTO)
        {
            try
            {
                await _service.ModifyProductAsync(combinedRDDTO);

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "RD Product updated successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(UpdateRDProduct), nameof(RDProductController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        // DELETE api/rdproduct/{branchId}/{id}
        [HttpDelete("{branchId}/{id}")]
        public async Task<IActionResult> DeleteRDProduct(int id, int branchId)
        {
            try
            {
                var success = await _service.DeleteProductAsync(id, branchId);

                if (!success)
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "RD Product not found."
                    });

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "RD Product deleted successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(DeleteRDProduct), nameof(RDProductController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occurred while deleting RD Product."
                });
            }
        }
    }
}
