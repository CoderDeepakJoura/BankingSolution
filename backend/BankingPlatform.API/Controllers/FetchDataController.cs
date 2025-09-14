using BankingPlatform.API.DTO.AccountHead;
using BankingPlatform.API.DTO.CommonDTO;
using BankingPlatform.API.DTO.PostOffice;
using BankingPlatform.API.DTO.Tehsil;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FetchDataController : ControllerBase
    {
        private readonly BankingDbContext _context;
        public FetchDataController(BankingDbContext context) 
        {
            _context = context;
        }

        [Authorize]
        [HttpPost("get_all_accountheadtypes")]
        public async Task<IActionResult> GetHeadType([FromBody] CommonDTO commonDTO)
        {
            var headTypes = await _context.accountheadtype
            .Where(x => x.branchid == commonDTO.BranchId)
            .Select(x => new AccountHeadTypeDTO
            {
                AccountHeadTypeId = x.id,
                AccountHeadTypeName = x.description
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = headTypes
            }
            );
        }

        [Authorize]
        [HttpPost("get_all_accountheads")]
        public async Task<IActionResult> GetAllHeads([FromBody] CommonDTO commonDTO)
        {
            var heads = await _context.accounthead
            .Where(x => x.branchid == commonDTO.BranchId)
            .Select(x => new AccountHeadDTO
            {
                AccountHeadId = x.id,
                AccountHeadName = x.headcode + "-" + x.name            
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = heads
            }
            );
        }
        [Authorize]
        [HttpPost("get_all_postoffices")]
        public async Task<IActionResult> GetAllPostOffices([FromBody] CommonDTO commonDTO)
        {
            var POs = await _context.postoffice
            .Where(x => x.branchid == commonDTO.BranchId)
            .Select(x => new PostOfficeMasterDTO
            {
                PostOfficeId = x.id,
                PostOfficeName = x.postofficename
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = POs
            }
            );
        }
        [Authorize]
        [HttpPost("get_all_zones")]
        public async Task<IActionResult> GetAllZones([FromBody] CommonDTO commonDTO)
        {
            var zones = await _context.zone
            .Where(x => x.branchid == commonDTO.BranchId)
            .Select(x => new ZoneMasterDto
            {
                ZoneId = x.id,
                ZoneName = x.zonename
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = zones
            }
            );
        }
        [Authorize]
        [HttpPost("get_all_thanas")]
        public async Task<IActionResult> GetAllThanas([FromBody] CommonDTO commonDTO)
        {
            var thanas = await _context.thana
            .Where(x => x.branchid == commonDTO.BranchId)
            .Select(x => new ThanaMasterDto
            {
                ThanaId = x.id,
                ThanaName = x.thananame
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = thanas
            }
            );
        }
        [Authorize]
        [HttpPost("get_all_tehsils")]
        public async Task<IActionResult> GetAllTehsils([FromBody] CommonDTO commonDTO)
        {
            var tehsils = await _context.tehsil
            .Where(x => x.branchid == commonDTO.BranchId)
            .Select(x => new TehsilMasterDTO
            {
                TehsilId = x.id,
                TehsilName = x.tehsilname
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = tehsils
            }
            );
        }
    }
}
