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
        private readonly IBLoanAdvancementService _ibLoanService;
        private readonly IBLoanExpenseService _ibLoanExpService;
        private readonly IBPreMatureService _ibPreMatureService;
        private readonly IBMatureService _ibMatureService;
        private readonly IBRDKistService _ibRDKistService;
        private readonly IBLoanRecoveryService _ibLoanRecService;

        public IBVoucherController(IBSavingDepositService ibService, IBLoanAdvancementService ibLoanService, IBLoanExpenseService ibLoanExpService, IBPreMatureService ibPreMatureService, IBMatureService ibMatureService, IBRDKistService ibRDKistService, IBLoanRecoveryService ibLoanRecService)
        {
            _ibService = ibService;
            _ibLoanService = ibLoanService;
            _ibLoanExpService = ibLoanExpService;
            _ibPreMatureService = ibPreMatureService;
            _ibMatureService = ibMatureService;
            _ibRDKistService = ibRDKistService;
            _ibLoanRecService = ibLoanRecService;
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

        // ── IB Loan Advancement endpoints ─────────────────────────────────────────

        // POST api/IBVoucher/loan-advancement/step1
        [HttpPost("loan-advancement/step1")]
        public async Task<IActionResult> CreateLoanAdvancementStep1([FromBody] IBLoanAdvancementStep1DTO dto)
        {
            try
            {
                var (success, message, ibVoucherId) = await _ibLoanService.CreateStep1Async(dto);
                if (!success) return BadRequest(new { success = false, message });
                return Ok(new { success = true, message, ibVoucherId });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to save IB loan advancement voucher." });
            }
        }

        // POST api/IBVoucher/loan-advancement/step2/{ibVoucherId}
        [HttpPost("loan-advancement/step2/{ibVoucherId}")]
        public async Task<IActionResult> ConfirmLoanAdvancementStep2(int ibVoucherId, [FromBody] IBSavingDepositStep2DTO dto)
        {
            try
            {
                var (success, message) = await _ibLoanService.CreateHOSettlementAsync(ibVoucherId, dto);
                if (!success) return BadRequest(new { success = false, message });
                return Ok(new { success = true, message });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to confirm HO loan advancement settlement." });
            }
        }

        // POST api/IBVoucher/loan-advancement/step3/{ibVoucherId}
        [HttpPost("loan-advancement/step3/{ibVoucherId}")]
        public async Task<IActionResult> CompleteLoanAdvancementStep3(int ibVoucherId, [FromBody] IBSavingDepositStep3DTO dto)
        {
            try
            {
                var (success, message) = await _ibLoanService.DispatchFinalStepAsync(ibVoucherId, dto);
                if (!success) return BadRequest(new { success = false, message });
                return Ok(new { success = true, message });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to complete IB loan advancement." });
            }
        }

        // GET api/IBVoucher/loan-advancement/pending-ho/{hoBrId}
        [HttpGet("loan-advancement/pending-ho/{hoBrId}")]
        public async Task<IActionResult> GetLoanAdvancementPendingForHO(int hoBrId)
        {
            try
            {
                var list = await _ibLoanService.GetPendingForHOAsync(hoBrId);
                return Ok(new { success = true, data = list });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to fetch pending loan advancement vouchers." });
            }
        }

        // GET api/IBVoucher/loan-advancement/incoming/{brId}
        [HttpGet("loan-advancement/incoming/{brId}")]
        public async Task<IActionResult> GetLoanAdvancementIncomingForBranch(int brId)
        {
            try
            {
                var list = await _ibLoanService.GetIncomingForBranchAsync(brId);
                return Ok(new { success = true, data = list });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to fetch incoming loan advancement vouchers." });
            }
        }

        // ── IB Loan Expense endpoints ─────────────────────────────────────────────

        // POST api/IBVoucher/loan-expense/step1
        [HttpPost("loan-expense/step1")]
        public async Task<IActionResult> CreateLoanExpenseStep1([FromBody] IBLoanExpenseStep1DTO dto)
        {
            try
            {
                var (success, message, ibVoucherId) = await _ibLoanExpService.CreateStep1Async(dto);
                if (!success) return BadRequest(new { success = false, message });
                return Ok(new { success = true, message, ibVoucherId });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to save IB loan expense voucher." });
            }
        }

        // POST api/IBVoucher/loan-expense/step2/{ibVoucherId}
        [HttpPost("loan-expense/step2/{ibVoucherId}")]
        public async Task<IActionResult> ConfirmLoanExpenseStep2(int ibVoucherId, [FromBody] IBSavingDepositStep2DTO dto)
        {
            try
            {
                var (success, message) = await _ibLoanExpService.CreateHOSettlementAsync(ibVoucherId, dto);
                if (!success) return BadRequest(new { success = false, message });
                return Ok(new { success = true, message });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to confirm HO loan expense settlement." });
            }
        }

        // POST api/IBVoucher/loan-expense/step3/{ibVoucherId}
        [HttpPost("loan-expense/step3/{ibVoucherId}")]
        public async Task<IActionResult> CompleteLoanExpenseStep3(int ibVoucherId, [FromBody] IBLoanExpenseFinalStepDTO dto)
        {
            try
            {
                var (success, message) = await _ibLoanExpService.DispatchFinalStepAsync(ibVoucherId, dto);
                if (!success) return BadRequest(new { success = false, message });
                return Ok(new { success = true, message });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to complete IB loan expense." });
            }
        }

        // GET api/IBVoucher/loan-expense/pending-ho/{hoBrId}
        [HttpGet("loan-expense/pending-ho/{hoBrId}")]
        public async Task<IActionResult> GetLoanExpensePendingForHO(int hoBrId)
        {
            try
            {
                var list = await _ibLoanExpService.GetPendingForHOAsync(hoBrId);
                return Ok(new { success = true, data = list });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to fetch pending loan expense vouchers." });
            }
        }

        // GET api/IBVoucher/loan-expense/incoming/{brId}
        [HttpGet("loan-expense/incoming/{brId}")]
        public async Task<IActionResult> GetLoanExpenseIncomingForBranch(int brId)
        {
            try
            {
                var list = await _ibLoanExpService.GetIncomingForBranchAsync(brId);
                return Ok(new { success = true, data = list });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to fetch incoming loan expense vouchers." });
            }
        }

        // ── IB Pre-Mature FD/RD endpoints ─────────────────────────────────────────
        // Step 1 is triggered via FDAccountMaster/premature-fd or RDAccountMaster/premature-rd
        // with IBPreMatureInfo set in the DTO.

        // POST api/IBVoucher/premature/step2/{ibVoucherId}
        [HttpPost("premature/step2/{ibVoucherId}")]
        public async Task<IActionResult> ConfirmPreMatureStep2(int ibVoucherId, [FromBody] IBSavingDepositStep2DTO dto)
        {
            try
            {
                var (success, message) = await _ibPreMatureService.ConfirmHOSettlementAsync(ibVoucherId, dto);
                if (!success) return BadRequest(new { success = false, message });
                return Ok(new { success = true, message });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to confirm HO pre-mature settlement." });
            }
        }

        // POST api/IBVoucher/premature/step3/{ibVoucherId}
        [HttpPost("premature/step3/{ibVoucherId}")]
        public async Task<IActionResult> CompletePreMatureStep3(int ibVoucherId, [FromBody] IBSavingDepositStep3DTO dto)
        {
            try
            {
                var (success, message) = await _ibPreMatureService.WriteFinalVoucherAsync(ibVoucherId, dto);
                if (!success) return BadRequest(new { success = false, message });
                return Ok(new { success = true, message });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to complete IB pre-mature credit." });
            }
        }

        // GET api/IBVoucher/premature/pending-ho/{hoBrId}
        [HttpGet("premature/pending-ho/{hoBrId}")]
        public async Task<IActionResult> GetPreMaturePendingForHO(int hoBrId)
        {
            try
            {
                var list = await _ibPreMatureService.GetPendingForHOAsync(hoBrId);
                return Ok(new { success = true, data = list });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to fetch pending pre-mature vouchers." });
            }
        }

        // GET api/IBVoucher/premature/incoming/{brId}
        [HttpGet("premature/incoming/{brId}")]
        public async Task<IActionResult> GetPreMatureIncomingForBranch(int brId)
        {
            try
            {
                var list = await _ibPreMatureService.GetIncomingForBranchAsync(brId);
                return Ok(new { success = true, data = list });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to fetch incoming pre-mature vouchers." });
            }
        }

        // ── IB Mature FD/RD endpoints ─────────────────────────────────────────────
        // Step 1 is triggered via FDAccountMaster/mature-fd or RDAccountMaster/mature-rd
        // with IBMatureInfo set in the DTO.

        // POST api/IBVoucher/mature/step2/{ibVoucherId}
        [HttpPost("mature/step2/{ibVoucherId}")]
        public async Task<IActionResult> ConfirmMatureStep2(int ibVoucherId, [FromBody] IBSavingDepositStep2DTO dto)
        {
            try
            {
                var (success, message) = await _ibMatureService.ConfirmHOSettlementAsync(ibVoucherId, dto);
                if (!success) return BadRequest(new { success = false, message });
                return Ok(new { success = true, message });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to confirm HO mature settlement." });
            }
        }

        // POST api/IBVoucher/mature/step3/{ibVoucherId}
        [HttpPost("mature/step3/{ibVoucherId}")]
        public async Task<IActionResult> CompleteMatureStep3(int ibVoucherId, [FromBody] IBSavingDepositStep3DTO dto)
        {
            try
            {
                var (success, message) = await _ibMatureService.WriteFinalVoucherAsync(ibVoucherId, dto);
                if (!success) return BadRequest(new { success = false, message });
                return Ok(new { success = true, message });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to complete IB mature credit." });
            }
        }

        // GET api/IBVoucher/mature/pending-ho/{hoBrId}
        [HttpGet("mature/pending-ho/{hoBrId}")]
        public async Task<IActionResult> GetMaturePendingForHO(int hoBrId)
        {
            try
            {
                var list = await _ibMatureService.GetPendingForHOAsync(hoBrId);
                return Ok(new { success = true, data = list });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to fetch pending mature vouchers." });
            }
        }

        // GET api/IBVoucher/mature/incoming/{brId}
        [HttpGet("mature/incoming/{brId}")]
        public async Task<IActionResult> GetMatureIncomingForBranch(int brId)
        {
            try
            {
                var list = await _ibMatureService.GetIncomingForBranchAsync(brId);
                return Ok(new { success = true, data = list });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to fetch incoming mature vouchers." });
            }
        }

        // ── IB RD Kist endpoints ──────────────────────────────────────────────────
        // Step 1 is submitted via the RD Kist form with ibDestBrId set.

        // POST api/IBVoucher/rdkist/step1
        [HttpPost("rdkist/step1")]
        public async Task<IActionResult> CreateRDKistStep1([FromBody] IBRDKistStep1DTO dto)
        {
            try
            {
                var (success, message, ibVoucherId) = await _ibRDKistService.CreateStep1Async(dto);
                if (!success) return BadRequest(new { success = false, message });
                return Ok(new { success = true, message = "IB RD Kist recorded successfully.", ibVoucherId });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to save IB RD Kist voucher." });
            }
        }

        // POST api/IBVoucher/rdkist/step2/{ibVoucherId}
        [HttpPost("rdkist/step2/{ibVoucherId}")]
        public async Task<IActionResult> ConfirmRDKistStep2(int ibVoucherId, [FromBody] IBSavingDepositStep2DTO dto)
        {
            try
            {
                var (success, message) = await _ibRDKistService.ConfirmHOSettlementAsync(ibVoucherId, dto);
                if (!success) return BadRequest(new { success = false, message });
                return Ok(new { success = true, message });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to confirm HO RD Kist settlement." });
            }
        }

        // POST api/IBVoucher/rdkist/step3/{ibVoucherId}
        [HttpPost("rdkist/step3/{ibVoucherId}")]
        public async Task<IActionResult> CompleteRDKistStep3(int ibVoucherId, [FromBody] IBSavingDepositStep3DTO dto)
        {
            try
            {
                var (success, message) = await _ibRDKistService.WriteFinalKistVoucherAsync(ibVoucherId, dto);
                if (!success) return BadRequest(new { success = false, message });
                return Ok(new { success = true, message });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to complete IB RD Kist." });
            }
        }

        // GET api/IBVoucher/rdkist/pending-ho/{hoBrId}
        [HttpGet("rdkist/pending-ho/{hoBrId}")]
        public async Task<IActionResult> GetRDKistPendingForHO(int hoBrId)
        {
            try
            {
                var list = await _ibRDKistService.GetPendingForHOAsync(hoBrId);
                return Ok(new { success = true, data = list });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to fetch pending RD Kist vouchers." });
            }
        }

        // GET api/IBVoucher/rdkist/incoming/{brId}
        [HttpGet("rdkist/incoming/{brId}")]
        public async Task<IActionResult> GetRDKistIncomingForBranch(int brId)
        {
            try
            {
                var list = await _ibRDKistService.GetIncomingForBranchAsync(brId);
                return Ok(new { success = true, data = list });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to fetch incoming RD Kist vouchers." });
            }
        }

        // ── IB Loan Recovery endpoints ────────────────────────────────────────────

        // POST api/IBVoucher/loan-recovery/step1
        [HttpPost("loan-recovery/step1")]
        public async Task<IActionResult> CreateLoanRecoveryStep1([FromBody] IBLoanRecoveryStep1DTO dto)
        {
            try
            {
                var (success, message, ibVoucherId) = await _ibLoanRecService.CreateStep1Async(dto);
                if (!success) return BadRequest(new { success = false, message });
                return Ok(new { success = true, message = "IB loan recovery recorded successfully.", ibVoucherId });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to save IB loan recovery voucher." });
            }
        }

        // POST api/IBVoucher/loan-recovery/step2/{ibVoucherId}
        [HttpPost("loan-recovery/step2/{ibVoucherId}")]
        public async Task<IActionResult> ConfirmLoanRecoveryStep2(int ibVoucherId, [FromBody] IBSavingDepositStep2DTO dto)
        {
            try
            {
                var (success, message) = await _ibLoanRecService.CreateHOSettlementAsync(ibVoucherId, dto);
                if (!success) return BadRequest(new { success = false, message });
                return Ok(new { success = true, message });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to confirm HO loan recovery settlement." });
            }
        }

        // POST api/IBVoucher/loan-recovery/step3/{ibVoucherId}
        [HttpPost("loan-recovery/step3/{ibVoucherId}")]
        public async Task<IActionResult> CompleteLoanRecoveryStep3(int ibVoucherId, [FromBody] IBLoanRecoveryFinalStepDTO dto)
        {
            try
            {
                var (success, message) = await _ibLoanRecService.CreateFinalStepAsync(ibVoucherId, dto);
                if (!success) return BadRequest(new { success = false, message });
                return Ok(new { success = true, message });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to complete IB loan recovery." });
            }
        }

        // GET api/IBVoucher/loan-recovery/pending-ho/{hoBrId}
        [HttpGet("loan-recovery/pending-ho/{hoBrId}")]
        public async Task<IActionResult> GetLoanRecoveryPendingForHO(int hoBrId)
        {
            try
            {
                var list = await _ibLoanRecService.GetPendingForHOAsync(hoBrId);
                return Ok(new { success = true, data = list });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to fetch pending loan recovery vouchers." });
            }
        }

        // GET api/IBVoucher/loan-recovery/incoming/{brId}
        [HttpGet("loan-recovery/incoming/{brId}")]
        public async Task<IActionResult> GetLoanRecoveryIncomingForBranch(int brId)
        {
            try
            {
                var list = await _ibLoanRecService.GetIncomingForBranchAsync(brId);
                return Ok(new { success = true, data = list });
            }
            catch (Exception)
            {
                return BadRequest(new { success = false, message = "Failed to fetch incoming loan recovery vouchers." });
            }
        }
    }
}
