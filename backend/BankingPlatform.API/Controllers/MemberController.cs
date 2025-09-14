using BankingPlatform.API.DTO.Member;
using BankingPlatform.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class MemberController : ControllerBase
    {
        private readonly MemberService _service;

        public MemberController(MemberService service)
        {
            _service = service;
        }


        [HttpPost]
        public async Task<IActionResult> CreateMember([FromBody] CombinedMemberDTO dto)
        {
            var result = await _service.CreateMemberAsync(dto);
            return Ok(new ResponseDto
            {
                Success = true,
                Message = "Member saved successfully"
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetAllMembers()
        {
            var result = await _service.GetAllMembersAsync();
            return Ok(result);
        }

        [HttpGet("{id}/{branchId}")]
        public async Task<IActionResult> GetMemberById(int id, int branchId)
        {
            var result = await _service.GetMemberByIdAsync(id, branchId);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPut]
        public async Task<IActionResult> UpdateMember([FromBody] CombinedMemberDTO dto)
        {
            var success = await _service.UpdateMemberAsync(dto);
            if (!success) return NotFound(new {Success = false, Message = "Some error occured while updating entries."});
            return Ok(new {Success = true, message = "Member updated successfully" });
        }

        [HttpDelete("{id}/{branchId}")]
        public async Task<IActionResult> DeleteMember(int id, int branchId)
        {
            var success = await _service.DeleteMemberAsync(id, branchId);
            if (!success) return NotFound();
            return Ok(new { message = "Member deleted successfully" });
        }
    }
}
