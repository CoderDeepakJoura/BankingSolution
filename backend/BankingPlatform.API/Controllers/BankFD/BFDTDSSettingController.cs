using BankingPlatform.API.DTO;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.BankFD;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Controllers.BankFD
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class BFDTDSSettingController : ControllerBase
    {
        private readonly BankingDbContext _context;
        public BFDTDSSettingController(BankingDbContext context) => _context = context;

        [HttpGet("{branchId}")]
        public async Task<IActionResult> GetAll(int branchId)
        {
            var items = await _context.bfdheadtdsaccsettings.AsNoTracking()
                .Where(x => x.BrId == branchId).ToListAsync();
            return Ok(new { Success = true, data = items });
        }

        [HttpPost]
        public async Task<IActionResult> Save([FromBody] BFDHeadTDSAccSetting dto)
        {
            if (dto.BrId <= 0) return BadRequest(new ResponseDto { Success = false, Message = "Invalid branch." });
            // Check duplicate head code for this branch (excluding current id)
            bool exists = await _context.bfdheadtdsaccsettings
                .AnyAsync(x => x.BrId == dto.BrId && x.HeadCode == dto.HeadCode && x.ID != dto.ID);
            if (exists) return BadRequest(new ResponseDto { Success = false, Message = "This account head is already configured." });

            if (dto.ID > 0)
            {
                var existing = await _context.bfdheadtdsaccsettings
                    .FirstOrDefaultAsync(x => x.ID == dto.ID && x.BrId == dto.BrId);
                if (existing == null) return NotFound(new ResponseDto { Success = false, Message = "Record not found." });
                existing.HeadCode = dto.HeadCode;
                existing.TDSAccId = dto.TDSAccId;
            }
            else
            {
                await _context.bfdheadtdsaccsettings.AddAsync(dto);
            }
            await _context.SaveChangesAsync();
            return Ok(new ResponseDto { Success = true, Message = "Saved successfully." });
        }

        [HttpDelete("{branchId}/{id}")]
        public async Task<IActionResult> Delete(int branchId, int id)
        {
            var item = await _context.bfdheadtdsaccsettings
                .FirstOrDefaultAsync(x => x.ID == id && x.BrId == branchId);
            if (item == null) return NotFound(new ResponseDto { Success = false, Message = "Record not found." });
            _context.bfdheadtdsaccsettings.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new ResponseDto { Success = true, Message = "Deleted successfully." });
        }
    }
}
