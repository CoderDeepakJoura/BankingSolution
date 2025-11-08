using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.ProductMasters.FD;
using BankingPlatform.API.Service;
using BankingPlatform.API.Service.ProductMasters.FD;
using BankingPlatform.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace BankingPlatform.API.Controllers.ProductMasters
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class FDProductController : ControllerBase
    {
        private readonly FDProductService _service;
        private readonly CommonFunctions _commonfunctions;

        public FDProductController(FDProductService service, CommonFunctions commonfunctions)
        {
            _service = service;
            _commonfunctions = commonfunctions;
        }

        [HttpPost]
        public async Task<IActionResult> CreateProduct([FromBody] CombinedFDDTO combinedFDDTO)
        {
            try
            {

                var result = await _service.CreateProductAsync(
                   combinedFDDTO
                );
                if (result != "success")
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = result.ToString()
                    });
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "FD Product saved successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(CreateProduct), nameof(FDProductController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while adding FD Product."
                });
            }
        }
        [HttpPost("get-all-products/{branchId}")]
        public async Task<IActionResult> GetAllFDProducts([FromRoute] int branchId, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var result = await _service.GetAllFDProductsAsync(branchId, filter);

                return Ok(new
                {
                    Success = true,
                    fdProducts = result.Items,
                    TotalCount = result.TotalCount
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetAllFDProducts), nameof(FDProductController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching Products. Please try again later."
                });
            }
        }

        [HttpGet("get-product-info/{id}/{branchId}")]
        public async Task<IActionResult> GetFDProductById(int id, int branchId)
        {
            var result = await _service.GetFDProductByIdAsync(id, branchId);
            if (result == null) return NotFound();
            return Ok(new
            {
                Success = true,
                data = result
            });
        }

        [HttpPut("{productId}")]
        public async Task<IActionResult> UpdateFDProduct([FromRoute] int productId, [FromBody] CombinedFDDTO combinedFDDTO)
        {
            try
            {
                var result = await _service.ModifyProductAsync(
                   combinedFDDTO
                );
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "FD Product updated successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(UpdateFDProduct), nameof(FDProductController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message =  ex.Message
                });
            }
        }

        [HttpDelete("{branchId}/{id}")]
        public async Task<IActionResult> DeleteFDProduct(int id, int branchId)
        {
            try
            {
                var success = await _service.DeleteProductAsync(id, branchId);
                if (!success) return NotFound();
                return Ok(new ResponseDto { Success = true, Message = "FD Product deleted successfully" });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(DeleteFDProduct), nameof(FDProductController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while deleting FD Product."
                });
            }
        }
    }
}
