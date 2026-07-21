using BankingPlatform.API.DTO.InterBranch;
using BankingPlatform.API.Service.InterBranch;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class IBVoucherController : ControllerBase
    {
        private readonly IBSavingDepositService _ibService;

        public IBVoucherController(IBSavingDepositService ibService)
        {
            _ibService = ibService;
        }

        // ── Step 1: originating branch initiates ──────────────────────────────
        // POST api/IBVoucher/saving-deposit/step1
        [HttpPost("saving-deposit/step1")]
        public async Task<IActionResult> CreateSavingDepositStep1([FromBody] IBSavingDepositStep1DTO dto)
        {
            try
            {
                var (success, message, ibVoucherId) = await _ibService.CreateStep1Async(dto);
                if (!success)
                    return BadRequest(new { success = false, message });
                return Ok(new { success = true, message = "Inter-branch saving deposit recorded successfully.", ibVoucherId });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to save inter-branch voucher." });
            }
        }

        // ── Step 1: originating branch initiates withdrawal ───────────────────
        // POST api/IBVoucher/saving-withdrawal/step1
        [HttpPost("saving-withdrawal/step1")]
        public async Task<IActionResult> CreateSavingWithdrawalStep1([FromBody] IBSavingDepositStep1DTO dto)
        {
            try
            {
                var (success, message, ibVoucherId) = await _ibService.CreateWithdrawalStep1Async(dto);
                if (!success)
                    return BadRequest(new { success = false, message });
                return Ok(new { success = true, message = "Inter-branch saving withdrawal recorded successfully.", ibVoucherId });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to save inter-branch withdrawal voucher." });
            }
        }

        // ── Step 2: HO settlement — dispatches by voucherType ─────────────────
        // POST api/IBVoucher/step2/{ibVoucherId}
        [HttpPost("step2/{ibVoucherId}")]
        public async Task<IActionResult> ConfirmStep2(int ibVoucherId, [FromBody] IBSavingDepositStep2DTO dto)
        {
            try
            {
                var (success, message) = await _ibService.DispatchStep2Async(ibVoucherId, dto);
                if (!success) return BadRequest(new { success = false, message });
                return Ok(new { success = true, message });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to confirm HO settlement." });
            }
        }

        // ── Step 3: destination branch completes — dispatches by voucherType ──
        // POST api/IBVoucher/step3/{ibVoucherId}
        [HttpPost("step3/{ibVoucherId}")]
        public async Task<IActionResult> CompleteStep3(int ibVoucherId, [FromBody] IBSavingDepositStep3DTO dto)
        {
            try
            {
                var (success, message) = await _ibService.DispatchStep3Async(ibVoucherId, dto);
                if (!success) return BadRequest(new { success = false, message });
                return Ok(new { success = true, message });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to complete inter-branch voucher." });
            }
        }

        // ── Queries ────────────────────────────────────────────────────────────
        // GET api/IBVoucher/pending-ho/{hoBrId}
        [HttpGet("pending-ho/{hoBrId}")]
        public async Task<IActionResult> GetPendingForHO(int hoBrId)
        {
            try
            {
                var list = await _ibService.GetPendingForHOAsync(hoBrId);
                return Ok(new { success = true, data = list });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to fetch pending vouchers." });
            }
        }

        // GET api/IBVoucher/notifications/{brId}
        [HttpGet("notifications/{brId}")]
        public async Task<IActionResult> GetNotifications(int brId)
        {
            try
            {
                var data = await _ibService.GetNotificationsAsync(brId);
                return Ok(new { success = true, data });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to fetch notifications." });
            }
        }

        // GET api/IBVoucher/incoming/{brId}
        [HttpGet("incoming/{brId}")]
        public async Task<IActionResult> GetIncomingForBranch(int brId)
        {
            try
            {
                var list = await _ibService.GetIncomingForBranchAsync(brId);
                return Ok(new { success = true, data = list });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to fetch incoming vouchers." });
            }
        }
    }
}
