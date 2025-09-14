using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Category;
using BankingPlatform.Infrastructure.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CategoryMasterController : ControllerBase
    {
        private readonly BankingDbContext _appContext;
        private readonly ILogger<CategoryMasterController> _logger;
        public CategoryMasterController(BankingDbContext appcontext, ILogger<CategoryMasterController> logger)
        {
            _appContext = appcontext;
            _logger = logger;
        }

        [Authorize]
        [HttpPost("create_category")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> CreateCategory([FromBody] CategoryMasterDTO categoryMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Create new Category attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }



                string inputName = categoryMasterDTO.CategoryName.Trim().ToLower();
                string? inputNameSL = categoryMasterDTO.CategoryNameSL?.Trim().ToLower();

                var duplicateCategories = await _appContext.category
                    .Where(c => c.branchid == categoryMasterDTO.BranchId)
                    .Where(c => c.categoryname.ToLower() == inputName ||
                               (!string.IsNullOrEmpty(inputNameSL) && c.categorynamesl != null && c.categorynamesl.ToLower() == inputNameSL))
                    .ToListAsync();

                var errors = new List<string>();

                if (duplicateCategories.Any(c => c.categoryname.ToLower() == inputName))
                    errors.Add("Category Name already exists.");

                if (!string.IsNullOrEmpty(inputNameSL) &&
                    duplicateCategories.Any(c => c.categorynamesl != null && c.categorynamesl.ToLower() == inputNameSL))
                    errors.Add("Category Name SL already exists.");

                if (errors.Any())
                {
                    _logger.LogWarning("Add category failed for CategoryId {CategoryId}, BranchId {BranchId}. Errors: {Errors}",
                        categoryMasterDTO.CategoryId, categoryMasterDTO.BranchId, string.Join(", ", errors));

                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join(Environment.NewLine, errors)
                    });
                }

                // Return all errors if any
                if (errors.Any())
                {
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join("\n", errors)
                    });
                }
                categoryMasterDTO.CategoryName = categoryMasterDTO.CategoryName?.Trim() ?? "";
                categoryMasterDTO.CategoryNameSL = categoryMasterDTO.CategoryNameSL?.Trim() ?? "";


                await _appContext.category.AddAsync(new Category
                {
                    branchid = categoryMasterDTO.BranchId,
                    categoryname = categoryMasterDTO.CategoryName,
                    categorynamesl = categoryMasterDTO.CategoryNameSL
                });
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Category saved successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating Category : {CategoryName},  CategoryNameSL : {CategoryNameSL}",
                       categoryMasterDTO?.CategoryName ?? "unknown", categoryMasterDTO?.CategoryNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }

        [HttpPost("get_all_category/{branchid}")]
        [EnableRateLimiting("Auth")]
        [Authorize]
        public async Task<IActionResult> GetAllCategorys([FromRoute] int branchid, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var query = _appContext.category.AsNoTracking();

                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var term = filter.SearchTerm;
                    query = query.Where(z =>
                        z.categoryname.Contains(term) ||
                        z.categorynamesl != null && z.categorynamesl.Contains(term));
                }
                var totalCount = await query.CountAsync();

                var items = await query
                    .Where(x=> x.branchid == branchid)
                    .OrderBy(z => z.categoryname)
                    .Skip((filter.PageNumber - 1) * filter.PageSize)
                    .Take(filter.PageSize)
                    .Select(z => new CategoryMasterDTO(z.categoryname, z.categorynamesl, z.id, z.branchid))
                    .ToListAsync();

                return Ok(new
                {
                    Success = true,
                    Category = items,
                    TotalCount = totalCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching Categorys");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "Unexpected error while fetching Categorys"
                });
            }
        }

        [Authorize]
        [HttpPost("modify_category")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> ModifyCategory([FromBody] CategoryMasterDTO categoryMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Modify Category attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the category to be modified exists
                var existingCategory = await _appContext.category
    .FirstOrDefaultAsync(c => c.id == categoryMasterDTO.CategoryId && c.branchid == categoryMasterDTO.BranchId);

                if (existingCategory == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Category not found."
                    });
                }
                string inputName = categoryMasterDTO.CategoryName.Trim().ToLower();
                string? inputNameSL = categoryMasterDTO.CategoryNameSL?.Trim().ToLower();

                var duplicateCategories = await _appContext.category
                    .Where(c => c.id != categoryMasterDTO.CategoryId)
                    .Where(c => c.categoryname.ToLower() == inputName ||
                               (!string.IsNullOrEmpty(inputNameSL) && c.categorynamesl != null && c.categorynamesl.ToLower() == inputNameSL))
                    .ToListAsync();

                var errors = new List<string>();

                if (duplicateCategories.Any(c => c.categoryname.ToLower() == inputName))
                    errors.Add("Category Name already exists.");

                if (!string.IsNullOrEmpty(inputNameSL) &&
                    duplicateCategories.Any(c => c.categorynamesl != null && c.categorynamesl.ToLower() == inputNameSL))
                    errors.Add("Category Name SL already exists.");

                if (errors.Any())
                {
                    _logger.LogWarning("Category update failed for CategoryId {CategoryId}, BranchId {BranchId}. Errors: {Errors}",
                        categoryMasterDTO.CategoryId, categoryMasterDTO.BranchId, string.Join(", ", errors));

                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join(Environment.NewLine, errors)
                    });
                }


                // Update the properties of the existing category entity
                existingCategory.categoryname = categoryMasterDTO.CategoryName?.Trim() ?? "";
                existingCategory.categorynamesl = categoryMasterDTO.CategoryNameSL?.Trim() ?? "";

                // Save changes to the database
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Category updated successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating Category : {CategoryName}, CategoryNameSL : {CategoryNameSL}",
                       categoryMasterDTO?.CategoryName ?? "unknown", categoryMasterDTO?.CategoryNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }


        [Authorize]
        [HttpPost("delete_category")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> DeleteCategory([FromBody] CategoryMasterDTO categoryMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Delete Category attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the category to be deleted exists
                var existingCategory = await _appContext.category.FindAsync(categoryMasterDTO.CategoryId, categoryMasterDTO.BranchId);
                if (existingCategory == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Category not found."
                    });
                }

                _appContext.category.Remove(existingCategory);
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Category deleted successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while deleting Category : {CategoryName}, CategoryNameSL : {CategoryNameSL}",
                       categoryMasterDTO?.CategoryName ?? "unknown", categoryMasterDTO?.CategoryNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }
    }
}
