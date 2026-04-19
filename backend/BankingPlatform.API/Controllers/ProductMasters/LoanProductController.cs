using BankingPlatform.API.Common;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.ProductMasters.Loan;
using BankingPlatform.API.Service.ProductMasters.Loan;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.ProductMasters
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class LoanProductController : ControllerBase
    {
        private readonly LoanProductService _service;
        private readonly CommonFunctions _commonFunctions;

        public LoanProductController(LoanProductService service, CommonFunctions commonFunctions)
        {
            _service = service;
            _commonFunctions = commonFunctions;
        }

        [HttpPost]
        public async Task<IActionResult> CreateProduct([FromBody] CombinedLoanProductDTO dto)
        {
            try
            {
                var result = await _service.CreateProductAsync(dto);
                if (result != "success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });

                return Ok(new ResponseDto { Success = true, Message = "Loan Product saved successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(CreateProduct), nameof(LoanProductController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error while adding Loan Product." });
            }
        }

        [HttpPost("get-all-products/{branchId}")]
        public async Task<IActionResult> GetAllProducts([FromRoute] int branchId, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var result = await _service.GetAllAsync(branchId, filter);
                return Ok(new { Success = true, loanProducts = result.Items, TotalCount = result.TotalCount });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(GetAllProducts), nameof(LoanProductController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error fetching Loan Products." });
            }
        }

        [HttpGet("get-product-info/{id}/{branchId}")]
        public async Task<IActionResult> GetById(int id, int branchId)
        {
            var result = await _service.GetByIdAsync(id, branchId);
            if (result == null) return NotFound();
            return Ok(new { Success = true, data = result });
        }

        [HttpPut("{productId}")]
        public async Task<IActionResult> UpdateProduct([FromRoute] int productId, [FromBody] CombinedLoanProductDTO dto)
        {
            try
            {
                var result = await _service.ModifyProductAsync(dto);
                if (result != "success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });

                return Ok(new ResponseDto { Success = true, Message = "Loan Product updated successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(UpdateProduct), nameof(LoanProductController));
                return BadRequest(new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        [HttpDelete("{branchId}/{id}")]
        public async Task<IActionResult> DeleteProduct(int id, int branchId)
        {
            try
            {
                var success = await _service.DeleteProductAsync(id, branchId);
                if (!success) return NotFound();
                return Ok(new ResponseDto { Success = true, Message = "Loan Product deleted successfully." });
            }
            catch (Exception ex)
            {
                await _commonFunctions.LogErrors(ex, nameof(DeleteProduct), nameof(LoanProductController));
                return BadRequest(new ResponseDto { Success = false, Message = "Error deleting Loan Product." });
            }
        }
    }
}