using BankingPlatform.API.DTO;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.BankFD;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Controllers.BankFD
{
    // ── DTOs ─────────────────────────────────────────────────────────────────

    public class FDTDSSlabDTO
    {
        public int Id { get; set; }
        public int BrId { get; set; }
        public string Name { get; set; } = "";
        public string? NameSL { get; set; }
        public DateTime Date { get; set; }
        public int Type { get; set; } = 8;
        public short WithPanCard { get; set; } = 0;
    }

    public class FDTDSSlabDetailDTO
    {
        public int Id { get; set; }
        public int BrId { get; set; }
        public int SlabID { get; set; }
        public decimal FromAmount { get; set; }
        public decimal ToAmount { get; set; }
        public double IntRate { get; set; }
    }

    public class FDTDSSlabWithDetailsDTO
    {
        public FDTDSSlabDTO Slab { get; set; } = new();
        public List<FDTDSSlabDetailDTO> Details { get; set; } = new();
    }

    // ── Controller ───────────────────────────────────────────────────────────

    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FDTDSSlabController : ControllerBase
    {
        private readonly BankingDbContext _context;
        public FDTDSSlabController(BankingDbContext context) => _context = context;

        // GET api/FDTDSSlab/{branchId}
        [HttpGet("{branchId}")]
        public async Task<IActionResult> GetAll(int branchId)
        {
            var slabs = await _context.fdtdsslab.AsNoTracking()
                .Where(x => x.BrId == branchId)
                .Select(x => new
                {
                    id = x.ID,
                    brId = x.BrId,
                    name = x.Name,
                    nameSL = x.NameSL,
                    date = x.Date,
                    type = x.Type,
                    withPanCard = x.WithPanCard
                })
                .ToListAsync();
            return Ok(new { Success = true, data = slabs });
        }

        // GET api/FDTDSSlab/{branchId}/{id}
        [HttpGet("{branchId}/{id}")]
        public async Task<IActionResult> GetById(int branchId, int id)
        {
            var slab = await _context.fdtdsslab.AsNoTracking()
                .FirstOrDefaultAsync(x => x.ID == id && x.BrId == branchId);
            if (slab == null) return NotFound(new ResponseDto { Success = false, Message = "Slab not found." });

            var details = await _context.fdtdsslabdetail.AsNoTracking()
                .Where(x => x.SlabID == id && x.BrId == branchId)
                .ToListAsync();

            return Ok(new
            {
                Success = true,
                data = new
                {
                    slab = new
                    {
                        id = slab.ID,
                        brId = slab.BrId,
                        name = slab.Name,
                        nameSL = slab.NameSL,
                        date = slab.Date,
                        type = slab.Type,
                        withPanCard = slab.WithPanCard
                    },
                    details = details.Select(d => new
                    {
                        id = d.ID,
                        brId = d.BrId,
                        slabID = d.SlabID,
                        fromAmount = d.FromAmount,
                        toAmount = d.ToAmount,
                        intRate = d.IntRate
                    })
                }
            });
        }

        // POST api/FDTDSSlab
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] FDTDSSlabWithDetailsDTO dto)
        {
            if (dto.Slab.BrId <= 0)
                return BadRequest(new ResponseDto { Success = false, Message = "Invalid branch." });
            if (string.IsNullOrWhiteSpace(dto.Slab.Name))
                return BadRequest(new ResponseDto { Success = false, Message = "Slab name is required." });

            var slab = new FDTDSSlab
            {
                BrId = dto.Slab.BrId,
                Name = dto.Slab.Name.Trim(),
                NameSL = dto.Slab.NameSL?.Trim(),
                Date = DateTime.SpecifyKind(dto.Slab.Date, DateTimeKind.Unspecified),
                Type = dto.Slab.Type,
                WithPanCard = dto.Slab.WithPanCard
            };
            await _context.fdtdsslab.AddAsync(slab);
            await _context.SaveChangesAsync();

            var detailEntities = dto.Details.Select(d => new FDTDSSlabDetail
            {
                BrId = slab.BrId,
                SlabID = slab.ID,
                FromAmount = d.FromAmount,
                ToAmount = d.ToAmount,
                IntRate = d.IntRate
            }).ToList();

            if (detailEntities.Any())
            {
                await _context.fdtdsslabdetail.AddRangeAsync(detailEntities);
                await _context.SaveChangesAsync();
            }

            return Ok(new ResponseDto { Success = true, Message = "Slab created successfully." });
        }

        // PUT api/FDTDSSlab/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] FDTDSSlabWithDetailsDTO dto)
        {
            if (dto.Slab.BrId <= 0)
                return BadRequest(new ResponseDto { Success = false, Message = "Invalid branch." });
            if (string.IsNullOrWhiteSpace(dto.Slab.Name))
                return BadRequest(new ResponseDto { Success = false, Message = "Slab name is required." });

            var slab = await _context.fdtdsslab
                .FirstOrDefaultAsync(x => x.ID == id && x.BrId == dto.Slab.BrId);
            if (slab == null)
                return NotFound(new ResponseDto { Success = false, Message = "Slab not found." });

            slab.Name = dto.Slab.Name.Trim();
            slab.NameSL = dto.Slab.NameSL?.Trim();
            slab.Date = DateTime.SpecifyKind(dto.Slab.Date, DateTimeKind.Unspecified);
            slab.Type = dto.Slab.Type;
            slab.WithPanCard = dto.Slab.WithPanCard;

            // Remove old details and re-insert
            var oldDetails = await _context.fdtdsslabdetail
                .Where(x => x.SlabID == id && x.BrId == dto.Slab.BrId)
                .ToListAsync();
            _context.fdtdsslabdetail.RemoveRange(oldDetails);

            var newDetails = dto.Details.Select(d => new FDTDSSlabDetail
            {
                BrId = slab.BrId,
                SlabID = slab.ID,
                FromAmount = d.FromAmount,
                ToAmount = d.ToAmount,
                IntRate = d.IntRate
            }).ToList();

            if (newDetails.Any())
                await _context.fdtdsslabdetail.AddRangeAsync(newDetails);

            await _context.SaveChangesAsync();
            return Ok(new ResponseDto { Success = true, Message = "Slab updated successfully." });
        }

        // DELETE api/FDTDSSlab/{branchId}/{id}
        [HttpDelete("{branchId}/{id}")]
        public async Task<IActionResult> Delete(int branchId, int id)
        {
            var slab = await _context.fdtdsslab
                .FirstOrDefaultAsync(x => x.ID == id && x.BrId == branchId);
            if (slab == null)
                return NotFound(new ResponseDto { Success = false, Message = "Slab not found." });

            // Delete details first (no cascade FK defined)
            var details = await _context.fdtdsslabdetail
                .Where(x => x.SlabID == id && x.BrId == branchId)
                .ToListAsync();
            _context.fdtdsslabdetail.RemoveRange(details);

            _context.fdtdsslab.Remove(slab);
            await _context.SaveChangesAsync();
            return Ok(new ResponseDto { Success = true, Message = "Slab deleted successfully." });
        }
    }
}
