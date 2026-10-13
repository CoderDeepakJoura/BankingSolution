using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Agent;
using BankingPlatform.API.Service.Agent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Agent
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AccountAgentController : ControllerBase
    {
        private readonly AccountAgentService _service;
        public AccountAgentController(AccountAgentService service) => _service = service;

        [HttpGet("by-agent/{branchId}/{agentId}")]
        public async Task<IActionResult> GetByAgent(int branchId, int agentId)
        {
            var items = await _service.GetAccountsByAgentAsync(branchId, agentId);
            return Ok(new { Success = true, Items = items });
        }

        [HttpGet("history/{branchId}/{accountId}")]
        public async Task<IActionResult> GetHistory(int branchId, int accountId)
        {
            var items = await _service.GetHistoryByAccountAsync(branchId, accountId);
            return Ok(new { Success = true, Items = items });
        }

        [HttpPost("transfer")]
        public async Task<IActionResult> Transfer([FromBody] TransferAgentDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(new ResponseDto { Success = false, Message = "Invalid data." });
            var result = await _service.TransferAccountsAsync(dto);
            if (result != "Success") return BadRequest(new ResponseDto { Success = false, Message = result });
            return Ok(new ResponseDto { Success = true, Message = "Accounts transferred successfully." });
        }

        [HttpPost("assign")]
        public async Task<IActionResult> Assign([FromBody] AssignAgentRequestDTO dto)
        {
            if (!DateTime.TryParse(dto.FromDate, out var fromDate))
                return BadRequest(new ResponseDto { Success = false, Message = "Invalid date." });
            var result = await _service.AssignAgentAsync(dto.BranchId, dto.AccountId, dto.AccType, dto.AgentId, fromDate);
            if (result != "Success") return BadRequest(new ResponseDto { Success = false, Message = result });
            return Ok(new ResponseDto { Success = true, Message = "Agent assigned successfully." });
        }
    }

    public class AssignAgentRequestDTO
    {
        public int BranchId { get; set; }
        public int AccountId { get; set; }
        public int AccType { get; set; }
        public int AgentId { get; set; }
        public string FromDate { get; set; } = "";
    }
}
