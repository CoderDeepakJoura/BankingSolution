using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Village;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class VillageController : ControllerBase
    {
        private readonly BankingDbContext _appContext;
        private readonly ILogger<VillageController> _logger;
        private readonly CommonFunctions _commonfns;
        public VillageController(BankingDbContext appcontext, ILogger<VillageController> logger, CommonFunctions commonfns)
        {
            _appContext = appcontext;
            _logger = logger;
            _commonfns = commonfns;
        }

        
        [HttpPost("create_village")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> CreateVillage([FromBody] VillageDTO villageMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Create new Village attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }



                var errors = new List<string>();
                bool anyExists = await _appContext.village
                    .AnyAsync(z =>
                        (
                         z.villagename.ToLower() == villageMasterDTO.VillageName.ToLower()
                          ||
                         (z.villagenamesl != null && z.villagenamesl.ToLower() == villageMasterDTO.VillageNameSL.ToLower())));

                if (anyExists)
                {

                    if (await _appContext.village.AnyAsync(z => z.id != villageMasterDTO.VillageId && z.villagename == villageMasterDTO.VillageName.ToLower()))
                        errors.Add("Village Name already exists.");

                    if (!string.IsNullOrWhiteSpace(villageMasterDTO.VillageNameSL) &&
                        await _appContext.village.AnyAsync(z => z.id != villageMasterDTO.VillageId && (z.villagenamesl != null && z.villagenamesl.ToLower() == villageMasterDTO.VillageNameSL.ToLower())))
                    {
                        errors.Add("\nVillage Name SL already exists.");
                    }
                }

                if (errors.Any())
                {
                    _logger.LogWarning("Village update failed due to duplicate data: {Errors}", string.Join(", ", errors));
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
                villageMasterDTO.VillageName = villageMasterDTO.VillageName?.Trim() ?? "";
                villageMasterDTO.VillageNameSL = villageMasterDTO.VillageNameSL?.Trim() ?? "";


                await _appContext.village.AddAsync(new Village
                {
                    branchid = villageMasterDTO.BranchId,
                    villagename = villageMasterDTO.VillageName,
                    villagenamesl = villageMasterDTO.VillageNameSL,
                    postofficeid = villageMasterDTO.PostOfficeId,
                    tehsilid = villageMasterDTO.TehsilId,
                    thanaid = villageMasterDTO.ThanaId,
                    zoneid = villageMasterDTO.ZoneId
                });
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Village saved successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating Village : {VillageName},  VillageNameSL : {VillageNameSL}",
                       villageMasterDTO?.VillageName ?? "unknown", villageMasterDTO?.VillageNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }

        [HttpPost("get_all_villages/{branchid}")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> GetAllVillages([FromRoute] int branchid, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var query = _appContext.village.AsNoTracking();
                filter ??= new LocationFilterDTO();
                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var term = filter.SearchTerm;
                    query = query.Where(z =>
                        z.villagename.Contains(term) ||

                        z.villagenamesl != null && z.villagenamesl.Contains(term));
                }
                var totalCount = await query.CountAsync();

                var itemsRaw = await query
                         .Where(x=> x.branchid == branchid)
                         .OrderBy(z => z.villagename)
                         .Skip((filter.PageNumber - 1) * filter.PageSize)
                         .Take(filter.PageSize)
                         .Select(z => new
                         {
                             z.villagename,
                             z.villagenamesl,
                             z.branchid,
                             z.tehsilid,
                             z.zoneid,
                             z.thanaid,
                             z.postofficeid,
                             z.id
                         })
                         .ToListAsync();

                var items = new List<VillageDTO>();

                foreach (var z in itemsRaw)
                {
                    items.Add(new VillageDTO(
                        z.id,
                        z.branchid,
                        z.villagename,
                        z.villagenamesl,
                        z.zoneid,
                        z.thanaid,
                        z.tehsilid,
                        z.postofficeid,
                        await(_commonfns.GetZoneNameFromId(z.zoneid, z.branchid)),
                        await (_commonfns.GetTehsilFromId(z.tehsilid, z.branchid)),
                        await (_commonfns.GetPostOfficeNameFromId(z.postofficeid, z.branchid)),
                        await (_commonfns.GetThanaNameFromId(z.thanaid, z.branchid))

                    ));
                }


                return Ok(new
                {
                    Success = true,
                    Villages = items,
                    TotalCount = totalCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching Villages");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "Unexpected error while fetching Villages"
                });
            }
        }

        [HttpPost("modify_village")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> ModifyVillage([FromBody] VillageDTO villageMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Modify Village attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the village to be modified exists
                var existingVillage = await _appContext.village.FindAsync(villageMasterDTO.VillageId, villageMasterDTO.BranchId);
                if (existingVillage == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Village not found."
                    });
                }

                // Check for duplicates, excluding the current village being modified
                var errors = new List<string>();
                bool anyExists = await _appContext.village
                    .AnyAsync(z => z.id != villageMasterDTO.VillageId
                    && z.branchid == villageMasterDTO.BranchId
                    &&
                        (z.villagename.ToLower() == villageMasterDTO.VillageName.ToLower() ||
                         (z.villagenamesl != null && z.villagenamesl.ToLower() == villageMasterDTO.VillageNameSL.ToLower())));

                if (anyExists)
                {
                    if (await _appContext.village.AnyAsync(z => z.id != villageMasterDTO.VillageId
                    && z.branchid == villageMasterDTO.BranchId
                    && z.villagename.ToLower() == villageMasterDTO.VillageName.ToLower()))
                        errors.Add("Village Name already exists.");

                    if (!string.IsNullOrWhiteSpace(villageMasterDTO.VillageNameSL) &&
                        await _appContext.village.AnyAsync(z => z.id != villageMasterDTO.VillageId && z.branchid == villageMasterDTO.BranchId && (z.villagenamesl != null && z.villagenamesl.ToLower() == villageMasterDTO.VillageNameSL.ToLower())))
                    {
                        errors.Add("Village Name SL already exists.");
                    }
                }

                if (errors.Any())
                {
                    _logger.LogWarning("Village update failed due to duplicate data: {Errors}", string.Join(", ", errors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = string.Join("\n", errors)
                    });
                }

                // Update the properties of the existing village entity
                existingVillage.villagename = villageMasterDTO.VillageName?.Trim() ?? "";
                existingVillage.villagenamesl = villageMasterDTO.VillageNameSL?.Trim() ?? "";
                existingVillage.tehsilid = villageMasterDTO.TehsilId;
                existingVillage.zoneid = villageMasterDTO.ZoneId;
                existingVillage.thanaid = villageMasterDTO.ThanaId;
                existingVillage.postofficeid = villageMasterDTO.PostOfficeId;

                // Save changes to the database
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Village updated successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating Village : {VillageName}, VillageNameSL : {VillageNameSL}",
                       villageMasterDTO?.VillageName ?? "unknown", villageMasterDTO?.VillageNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }


        [HttpPost("delete_village")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> DeleteVillage([FromBody] VillageDTO villageMasterDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Delete Village attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                // Check if the village to be deleted exists
                var existingVillage = await _appContext.village.FindAsync(villageMasterDTO.VillageId, villageMasterDTO.BranchId);
                if (existingVillage == null)
                {
                    return NotFound(new ResponseDto
                    {
                        Success = false,
                        Message = "Village not found."
                    });
                }

                _appContext.village.Remove(existingVillage);
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Village deleted successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while deleting Village : {VillageName}, VillageNameSL : {VillageNameSL}",
                       villageMasterDTO?.VillageName ?? "unknown", villageMasterDTO?.VillageNameSL ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }
    }
}

