using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Miscalleneous;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Miscallenous
{
    [Route("api/[controller]")]
    [Authorize]
    [ApiController]
    public class OccupationController : ControllerBase
    {
        private readonly BankingDbContext _appContext;
        private readonly ILogger<OccupationController> _logger;
        private readonly CommonFunctions _commonFunctions;
        public OccupationController(BankingDbContext appcontext, ILogger<OccupationController> logger, CommonFunctions commonFunctions)
        {
            _appContext = appcontext;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }

        
        [HttpPost]
        public async Task<IActionResult> CreateOccupation([FromBody] PatwarDTO occupationMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Create new Occupation attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }



                string inputName = occupationMasterDTO.Description.Trim().ToLower();
                string? inputNameSL = occupationMasterDTO.DescriptionSL?.Trim().ToLower();

                var duplicateCategories = await _appContext.occupation
                    .Where(c => c.branchid == occupationMasterDTO.BranchId)
                    .Where(c => c.description.ToLower() == inputName ||
                               !string.IsNullOrEmpty(inputNameSL) && c.descriptionsl != null && c.descriptionsl.ToLower() == inputNameSL)
                    .ToListAsync();

                var errors = new List<string>();

                if (duplicateCategories.Any(c => c.description.ToLower() == inputName))
                    errors.Add("Occupation Name already exists.");

                if (!string.IsNullOrEmpty(inputNameSL) &&
                    duplicateCategories.Any(c => c.descriptionsl != null && c.descriptionsl.ToLower() == inputNameSL))
                    errors.Add("Occupation Name SL already exists.");

                if (errors.Any())
                {
                    _logger.LogWarning("Add occupation failed for OccupationId {OccupationId}, BranchId {BranchId}. Errors: {Errors}",
                        occupationMasterDTO.OccupationId, occupationMasterDTO.BranchId, string.Join(", ", errors));

                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join(Environment.NewLine, errors)
                    });
                }


                occupationMasterDTO.Description = occupationMasterDTO.Description?.Trim() ?? "";
                occupationMasterDTO.DescriptionSL = occupationMasterDTO.DescriptionSL?.Trim() ?? "";


                await _appContext.occupation.AddAsync(new Infrastructure.Models.Miscalleneous.Occupation
                {
                    branchid = occupationMasterDTO.BranchId,
                    description = occupationMasterDTO.Description,
                    descriptionsl = occupationMasterDTO.DescriptionSL
                });
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Occupation saved successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating Occupation : {Description},  DescriptionSL : {DescriptionSL}",
                       occupationMasterDTO?.Description ?? "unknown", occupationMasterDTO?.DescriptionSL ?? "unknown");
                await _commonFunctions.LogErrors(ex, nameof(CreateOccupation), "OccupationMasterController");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }

        [HttpPost("occupations_info/{branchid}")]
        public async Task<IActionResult> GetAllOccupations([FromRoute] int branchid, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var query = _appContext.occupation.AsNoTracking();

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
                    .Select(z => new OccupationDTO(z.description, z.descriptionsl, z.id, z.branchid))
                    .ToListAsync();

                return Ok(new
                {
                    Success = true,
                    Occupations = items,
                    TotalCount = totalCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching Occupations");
                await _commonFunctions.LogErrors(ex, nameof(GetAllOccupations), "OccupationMasterController");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "Unexpected error while fetching Occupations"
                });
            }
        }

        [HttpPut]
        public async Task<IActionResult> ModifyOccupation([FromBody] PatwarDTO occupationMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Modify Occupation attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the occupation to be modified exists
                var existingOccupation = await _appContext.occupation
    .FirstOrDefaultAsync(c => c.id == occupationMasterDTO.OccupationId && c.branchid == occupationMasterDTO.BranchId);

                if (existingOccupation == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Occupation not found."
                    });
                }
                string inputName = occupationMasterDTO.Description.Trim().ToLower();
                string? inputNameSL = occupationMasterDTO.DescriptionSL?.Trim().ToLower();

                var duplicateCategories = await _appContext.occupation
                    .Where(c => c.id != occupationMasterDTO.OccupationId)
                    .Where(c => c.description.ToLower() == inputName ||
                               !string.IsNullOrEmpty(inputNameSL) && c.descriptionsl != null && c.descriptionsl.ToLower() == inputNameSL)
                    .ToListAsync();

                var errors = new List<string>();

                if (duplicateCategories.Any(c => c.description.ToLower() == inputName))
                    errors.Add("Occupation Name already exists.");

                if (!string.IsNullOrEmpty(inputNameSL) &&
                    duplicateCategories.Any(c => c.descriptionsl != null && c.descriptionsl.ToLower() == inputNameSL))
                    errors.Add("Occupation Name SL already exists.");

                if (errors.Any())
                {
                    _logger.LogWarning("Occupation update failed for OccupationId {OccupationId}, BranchId {BranchId}. Errors: {Errors}",
                        occupationMasterDTO.OccupationId, occupationMasterDTO.BranchId, string.Join(", ", errors));

                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join(Environment.NewLine, errors)
                    });
                }


                // Update the properties of the existing occupation entity
                existingOccupation.description = occupationMasterDTO.Description?.Trim() ?? "";
                existingOccupation.descriptionsl = occupationMasterDTO.DescriptionSL?.Trim() ?? "";

                // Save changes to the database
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Occupation updated successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating Occupation : {Description}, DescriptionSL : {DescriptionSL}",
                       occupationMasterDTO?.Description ?? "unknown", occupationMasterDTO?.DescriptionSL ?? "unknown");
                await _commonFunctions.LogErrors(ex, nameof(ModifyOccupation), "OccupationMasterController");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }



        [HttpDelete("{id}/{branchId}")]
        public async Task<IActionResult> DeleteOccupation(int id, int branchId)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Delete Occupation attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the occupation to be deleted exists
                var existingOccupation = await _appContext.occupation.FindAsync(id, branchId);
                if (existingOccupation == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Occupation not found."
                    });
                }

                _appContext.occupation.Remove(existingOccupation);
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Occupation deleted successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while deleting Occupation");
                await _commonFunctions.LogErrors(ex, nameof(DeleteOccupation), "OccupationController");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }
    }
}
