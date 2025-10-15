using BankingPlatform.API.Controllers.Miscallenous;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Location.Patwar;
using BankingPlatform.API.DTO.Miscalleneous;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Location
{
    [Route("api/[controller]")]
    [ApiController]
    public class PatwarController : ControllerBase
    {
        private readonly BankingDbContext _appContext;
        private readonly ILogger<PatwarController> _logger;
        private readonly CommonFunctions _commonFunctions;
        public PatwarController(BankingDbContext appcontext, ILogger<PatwarController> logger, CommonFunctions commonFunctions)
        {
            _appContext = appcontext;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }


        [HttpPost]
        public async Task<IActionResult> CreatePatwar([FromBody] PatwarDTO patwarMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Create new Patwar attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }



                string inputName = patwarMasterDTO.Description.Trim().ToLower();
                string? inputNameSL = patwarMasterDTO.DescriptionSL?.Trim().ToLower();

                var duplicateCategories = await _appContext.patwar
                    .Where(c => c.branchid == patwarMasterDTO.BranchId)
                    .Where(c => c.description.ToLower() == inputName ||
                               !string.IsNullOrEmpty(inputNameSL) && c.descriptionsl != null && c.descriptionsl.ToLower() == inputNameSL)
                    .ToListAsync();

                var errors = new List<string>();

                if (duplicateCategories.Any(c => c.description.ToLower() == inputName))
                    errors.Add("Patwar Name already exists.");

                if (!string.IsNullOrEmpty(inputNameSL) &&
                    duplicateCategories.Any(c => c.descriptionsl != null && c.descriptionsl.ToLower() == inputNameSL))
                    errors.Add("Patwar Name SL already exists.");

                if (errors.Any())
                {
                    _logger.LogWarning("Add patwar failed for PatwarId {PatwarId}, BranchId {BranchId}. Errors: {Errors}",
                        patwarMasterDTO.PatwarId, patwarMasterDTO.BranchId, string.Join(", ", errors));

                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join(Environment.NewLine, errors)
                    });
                }


                patwarMasterDTO.Description = patwarMasterDTO.Description?.Trim() ?? "";
                patwarMasterDTO.DescriptionSL = patwarMasterDTO.DescriptionSL?.Trim() ?? "";


                await _appContext.patwar.AddAsync(new Infrastructure.Models.Location.Patwar
                {
                    branchid = patwarMasterDTO.BranchId,
                    description = patwarMasterDTO.Description,
                    descriptionsl = patwarMasterDTO.DescriptionSL
                });
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Patwar saved successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating Patwar : {Description},  DescriptionSL : {DescriptionSL}",
                       patwarMasterDTO?.Description ?? "unknown", patwarMasterDTO?.DescriptionSL ?? "unknown");
                await _commonFunctions.LogErrors(ex, nameof(CreatePatwar), "PatwarMasterController");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }

        [HttpPost("patwars_info/{branchid}")]
        public async Task<IActionResult> GetAllPatwars([FromRoute] int branchid, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var query = _appContext.patwar.AsNoTracking();

                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var term = filter.SearchTerm;
                    query = query.Where(z =>
                        z.description.ToLower().Contains(term.ToLower()) ||
                        z.descriptionsl != null && z.descriptionsl.ToLower().Contains(term.ToLower()));
                }
                var totalCount = await query.CountAsync();

                var items = await query
                    .Where(x => x.branchid == branchid)
                    .OrderBy(z => z.description)
                    .Skip((filter.PageNumber - 1) * filter.PageSize)
                    .Take(filter.PageSize)
                    .Select(z => new PatwarDTO(z.description, z.descriptionsl, z.id, z.branchid))
                    .ToListAsync();

                return Ok(new
                {
                    Success = true,
                    Patwars = items,
                    TotalCount = totalCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching Patwars");
                await _commonFunctions.LogErrors(ex, nameof(GetAllPatwars), "PatwarMasterController");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "Unexpected error while fetching Patwars"
                });
            }
        }

        [HttpPut]
        public async Task<IActionResult> ModifyPatwar([FromBody] PatwarDTO patwarMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Modify Patwar attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the patwar to be modified exists
                var existingPatwar = await _appContext.patwar
    .FirstOrDefaultAsync(c => c.id == patwarMasterDTO.PatwarId && c.branchid == patwarMasterDTO.BranchId);

                if (existingPatwar == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Patwar not found."
                    });
                }
                string inputName = patwarMasterDTO.Description.Trim().ToLower();
                string? inputNameSL = patwarMasterDTO.DescriptionSL?.Trim().ToLower();

                var duplicateCategories = await _appContext.patwar
                    .Where(c => c.id != patwarMasterDTO.PatwarId)
                    .Where(c => c.description.ToLower() == inputName ||
                               !string.IsNullOrEmpty(inputNameSL) && c.descriptionsl != null && c.descriptionsl.ToLower() == inputNameSL)
                    .ToListAsync();

                var errors = new List<string>();

                if (duplicateCategories.Any(c => c.description.ToLower() == inputName))
                    errors.Add("Patwar Name already exists.");

                if (!string.IsNullOrEmpty(inputNameSL) &&
                    duplicateCategories.Any(c => c.descriptionsl != null && c.descriptionsl.ToLower() == inputNameSL))
                    errors.Add("Patwar Name SL already exists.");

                if (errors.Any())
                {
                    _logger.LogWarning("Patwar update failed for PatwarId {PatwarId}, BranchId {BranchId}. Errors: {Errors}",
                        patwarMasterDTO.PatwarId, patwarMasterDTO.BranchId, string.Join(", ", errors));

                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join(Environment.NewLine, errors)
                    });
                }


                // Update the properties of the existing patwar entity
                existingPatwar.description = patwarMasterDTO.Description?.Trim() ?? "";
                existingPatwar.descriptionsl = patwarMasterDTO.DescriptionSL?.Trim() ?? "";

                // Save changes to the database
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Patwar updated successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating Patwar : {Description}, DescriptionSL : {DescriptionSL}",
                       patwarMasterDTO?.Description ?? "unknown", patwarMasterDTO?.DescriptionSL ?? "unknown");
                await _commonFunctions.LogErrors(ex, nameof(ModifyPatwar), "PatwarMasterController");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }



        [HttpDelete("{id}/{branchId}")]
        public async Task<IActionResult> DeletePatwar(int id, int branchId)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Delete Patwar attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the patwar to be deleted exists
                var existingPatwar = await _appContext.patwar.FindAsync(id, branchId);
                if (existingPatwar == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Patwar not found."
                    });
                }

                _appContext.patwar.Remove(existingPatwar);
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Patwar deleted successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while deleting Patwar");
                await _commonFunctions.LogErrors(ex, nameof(DeletePatwar), "PatwarController");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }
    }
}
