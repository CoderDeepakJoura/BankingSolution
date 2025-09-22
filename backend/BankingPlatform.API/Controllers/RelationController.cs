using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Location.Relation;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RelationController : ControllerBase
    {
        private readonly BankingDbContext _appContext;
        private readonly ILogger<RelationController> _logger;
        public RelationController(BankingDbContext appcontext, ILogger<RelationController> logger)
        {
            _appContext = appcontext;
            _logger = logger;
        }

        [Authorize]
        [HttpPost("create_relation")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> CreateRelation([FromBody] RelationDTO relationMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Create new Relation attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }



                var errors = new List<string>();
                bool anyExists = await _appContext.relation
                    .AnyAsync(z =>
                        (
                         z.description.ToLower() == relationMasterDTO.Description.ToLower() ||
                         (z.descriptionsl != null && z.descriptionsl.ToLower() == relationMasterDTO.DescriptionSL.ToLower())));

                if (anyExists)
                {

                    if (await _appContext.relation.AnyAsync(z => z.id != relationMasterDTO.RelationId && z.description == relationMasterDTO.Description.ToLower()))
                        errors.Add("Relation Name already exists.");

                    if (!string.IsNullOrWhiteSpace(relationMasterDTO.DescriptionSL) &&
                        await _appContext.relation.AnyAsync(z => z.id != relationMasterDTO.RelationId && (z.descriptionsl != null && z.descriptionsl.ToLower() == relationMasterDTO.DescriptionSL.ToLower())))
                    {
                        errors.Add("Relation Name SL already exists.");
                    }
                }

                if (errors.Any())
                {
                    _logger.LogWarning("Relation update failed due to duplicate data: {Errors}", string.Join(", ", errors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join("\n", errors)
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
                relationMasterDTO.Description = relationMasterDTO.Description?.Trim() ?? "";
                relationMasterDTO.DescriptionSL = relationMasterDTO.DescriptionSL?.Trim() ?? "";


                await _appContext.relation.AddAsync(new Relation
                {
                    description = relationMasterDTO.Description,
                    descriptionsl = relationMasterDTO.DescriptionSL
                });
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Relation saved successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating Relation : {Description},  DescriptionSL : {DescriptionSL}",
                       relationMasterDTO?.Description ?? "unknown", relationMasterDTO?.DescriptionSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }

        [HttpPost("get_all_relation")]
        [EnableRateLimiting("Auth")]
        [Authorize]
        public async Task<IActionResult> GetAllRelations([FromBody] LocationFilterDTO filter)
        {
            try
            {
                var query = _appContext.relation.AsNoTracking();

                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var term = filter.SearchTerm;
                    query = query.Where(z =>
                        z.description.Contains(term) ||
                        z.descriptionsl != null && z.descriptionsl.Contains(term));
                }
                var totalCount = await query.CountAsync();

                var items = await query
                    .OrderBy(z => z.description)
                    .Skip((filter.PageNumber - 1) * filter.PageSize)
                    .Take(filter.PageSize)
                    .Select(z => new RelationDTO(z.id,z.description, z.descriptionsl ))
                    .ToListAsync();

                return Ok(new
                {
                    Success = true,
                    Relation = items,
                    TotalCount = totalCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching Relations");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "Unexpected error while fetching Relations"
                });
            }
        }

        [Authorize]
        [HttpPost("modify_relation")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> ModifyRelation([FromBody] RelationDTO relationMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Modify Relation attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the relation to be modified exists
                var existingRelation = await _appContext.relation.FindAsync(relationMasterDTO.RelationId);
                if (existingRelation == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Relation not found."
                    });
                }

                // Check for duplicates, excluding the current relation being modified
                var errors = new List<string>();
                bool anyExists = await _appContext.relation
                    .AnyAsync(z => z.id != relationMasterDTO.RelationId &&
                        (z.description.ToLower() == relationMasterDTO.Description.ToLower() ||
                         (z.descriptionsl != null && z.descriptionsl.ToLower() == relationMasterDTO.DescriptionSL.ToLower())));

                if (anyExists)
                {
                    if (await _appContext.relation.AnyAsync(z => z.id != relationMasterDTO.RelationId && z.description.ToLower() == relationMasterDTO.Description.ToLower()))
                        errors.Add("Relation Name already exists.");

                    if (!string.IsNullOrWhiteSpace(relationMasterDTO.DescriptionSL) &&
                        await _appContext.relation.AnyAsync(z => z.id != relationMasterDTO.RelationId && (z.descriptionsl != null && z.descriptionsl.ToLower() == relationMasterDTO.DescriptionSL.ToLower())))
                    {
                        errors.Add("Relation Name SL already exists.");
                    }
                }

                if (errors.Any())
                {
                    _logger.LogWarning("Relation update failed due to duplicate data: {Errors}", string.Join(", ", errors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join("\n", errors)
                    });
                }

                // Update the properties of the existing relation entity
                existingRelation.description = relationMasterDTO.Description?.Trim() ?? "";
                existingRelation.descriptionsl = relationMasterDTO.DescriptionSL?.Trim() ?? "";

                // Save changes to the database
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Relation updated successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating Relation : {Description}, DescriptionSL : {DescriptionSL}",
                       relationMasterDTO?.Description ?? "unknown", relationMasterDTO?.DescriptionSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }


        [Authorize]
        [HttpPost("delete_relation")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> DeleteRelation([FromBody] RelationDTO relationMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Delete Relation attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the relation to be deleted exists
                var existingRelation = await _appContext.relation.FindAsync(relationMasterDTO.RelationId);
                if (existingRelation == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Relation not found."
                    });
                }

                _appContext.relation.Remove(existingRelation);
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Relation deleted successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while deleting Relation : {Description}, DescriptionSL : {DescriptionSL}",
                       relationMasterDTO?.Description ?? "unknown", relationMasterDTO?.DescriptionSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }
    }
}
