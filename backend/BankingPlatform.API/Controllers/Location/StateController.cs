using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Location.State;
using BankingPlatform.Infrastructure.Models.Location;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Location
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class StateController : ControllerBase
    {
        private readonly BankingDbContext _appContext;
        private readonly ILogger<StateController> _logger;
        private readonly CommonFunctions _commonfns;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public StateController(BankingDbContext appcontext, ILogger<StateController> logger, CommonFunctions commonfns, IHttpContextAccessor httpContextAccessor)
        {
            _appContext = appcontext;
            _logger = logger;
            _commonfns = commonfns;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Create new state - POST /api/state
        /// </summary>
        [HttpPost]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> CreateState([FromBody] StateDTO stateMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Create new State attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                var errors = new List<string>();
                // Normalize inputs for case-insensitive comparisons
                var normalizedStateName = stateMasterDTO.StateName?.Trim().ToLower();
                var normalizedStateCode = stateMasterDTO.StateCode?.Trim().ToLower();

                // Get all possible duplicates in a single query
                var duplicates = await _appContext.state
                    .Where(z => z.statename.ToLower() == normalizedStateName || z.statecode == normalizedStateCode)
                    .ToListAsync();

                // Check conflicts in memory
                if (duplicates.Any(d => d.statename.ToLower() == normalizedStateName))
                {
                    errors.Add("State Name already exists.");
                }
                if (duplicates.Any(d => d.statecode == normalizedStateCode))
                {
                    errors.Add("State Code already exists.");
                }

                if (errors.Any())
                {
                    _logger.LogWarning("State Add failed due to duplicate data: {Errors}", string.Join(", ", errors));
                    return Conflict(new ResponseDto // Changed to Conflict status
                    {
                        Success = false,
                        Message = string.Join("\n", errors)
                    });
                }

                stateMasterDTO.StateName = stateMasterDTO.StateName?.Trim() ?? "";
                stateMasterDTO.StateCode = stateMasterDTO.StateCode?.Trim() ?? "";

                var newState = new State
                {
                    statename = stateMasterDTO.StateName,
                    statecode = stateMasterDTO.StateCode,
                };

                await _appContext.state.AddAsync(newState);
                await _appContext.SaveChangesAsync();

                // Return Created status with location header
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "State saved successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating State : {StateName},  StateCode : {StateCode}",
                       stateMasterDTO?.StateName ?? "unknown", stateMasterDTO?.StateCode ?? "unknown");
                await _commonfns.LogErrors(ex, nameof(CreateState), "StateController");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred" + ex.Message
                });
            }
        }

        /// <summary>
        /// Get all states - GET /api/state?searchTerm=term&pageNumber=1&pageSize=10
        /// </summary>
        [HttpGet]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> GetAllStates([FromQuery] string? searchTerm, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            try
            {
                var query = _appContext.state.AsNoTracking();

                if (!string.IsNullOrWhiteSpace(searchTerm))
                {
                    var term = searchTerm;
                    query = query.Where(z =>
                        z.statename.ToLower().Contains(term.ToLower()) ||
                        z.statecode.Contains(term));
                }

                var totalCount = await query.CountAsync();
                var items = await query
                         .OrderBy(z => z.statename)
                         .Skip((pageNumber - 1) * pageSize)
                         .Take(pageSize)
                         .Select(z => new StateDTO(z.statecode, z.statename, z.id))
                         .ToListAsync();

                return Ok(new
                {
                    Success = true,
                    States = items,
                    TotalCount = totalCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching States");
                await _commonfns.LogErrors(ex, nameof(GetAllStates), "StateController");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "Unexpected error while fetching States." + ex.Message
                });
            }
        }

        /// <summary>
        /// Update state - PUT /api/state/{id}
        /// </summary>
        [HttpPut("{id}")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> ModifyState([FromRoute] int id, [FromBody] StateDTO stateMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Modify State attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the state to be modified exists
                var existingState = await _appContext.state.FindAsync(id);
                if (existingState == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "State not found."
                    });
                }

                var errors = new List<string>();
                // Normalize inputs for case-insensitive comparisons
                var normalizedStateName = stateMasterDTO.StateName?.Trim().ToLower();
                var normalizedStateCode = stateMasterDTO.StateCode?.Trim().ToLower();

                var duplicates = await _appContext.state
                    .Where(z => z.id != id &&
                                (z.statename.ToLower() == normalizedStateName || z.statecode.ToLower() == normalizedStateCode))
                    .ToListAsync();

                // Check conflicts in memory
                if (duplicates.Any(d => d.statename.ToLower() == normalizedStateName))
                {
                    errors.Add("State Name already exists.");
                }
                if (duplicates.Any(d => d.statecode.ToLower() == normalizedStateCode))
                {
                    errors.Add("State Code already exists.");
                }

                if (errors.Any())
                {
                    _logger.LogWarning("State update failed due to duplicate data: {Errors}", string.Join(", ", errors));
                    return Conflict(new ResponseDto // Changed to Conflict status
                    {
                        Success = false,
                        Message = string.Join("\n", errors)
                    });
                }

                // Update the properties of the existing state entity
                existingState.statename = stateMasterDTO.StateName?.Trim() ?? "";
                existingState.statecode = stateMasterDTO.StateCode?.Trim() ?? "";

                // Save changes to the database
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "State updated successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while updating State : {StateName}, StateCode : {StateCode}",
                       stateMasterDTO?.StateName ?? "unknown", stateMasterDTO?.StateCode ?? "unknown");
                await _commonfns.LogErrors(ex, nameof(ModifyState), "StateController");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }

        [HttpDelete("{id}")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> DeleteState([FromRoute] int id)
        {
            try
            {
                // Check if the state to be deleted exists
                var existingState = await _appContext.state.FindAsync(id);
                if (existingState == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "State not found."
                    });
                }
                var user = _httpContextAccessor.HttpContext!.User!;
                if (await _commonfns.CheckIfStateInUse(id, int.Parse(user.FindFirst("branchId")?.Value!)))
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "State is in use and cannot be deleted."
                    });
                _appContext.state.Remove(existingState);
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "State deleted successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while deleting State with ID: {StateId}", id);
                await _commonfns.LogErrors(ex, nameof(DeleteState), "StateController");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }
    }
}
