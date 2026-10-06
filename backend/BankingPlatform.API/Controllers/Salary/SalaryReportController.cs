using BankingPlatform.API.DTO.Salary;
using BankingPlatform.API.Service.Salary;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Salary
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SalaryReportController : ControllerBase
    {
        private readonly BonusReportService _bonusService;
        private readonly SalaryReportsService _reportsSvc;

        public SalaryReportController(BonusReportService bonusService, SalaryReportsService reportsSvc)
        {
            _bonusService = bonusService;
            _reportsSvc   = reportsSvc;
        }

        // ── Voucher dropdown ──────────────────────────────────────────────────

        [HttpGet("salary-vouchers/{branchId}")]
        public async Task<IActionResult> GetVouchers(int branchId, [FromQuery] string month)
        {
            var items = await _reportsSvc.GetVouchersAsync(branchId, month);
            return Ok(new { success = true, items });
        }

        // ── Bonus ─────────────────────────────────────────────────────────────

        [HttpPost("bonus-report")]
        public async Task<IActionResult> GetBonusReport([FromBody] BonusReportRequestDTO dto)
        {
            try
            {
                var result = await _bonusService.GetBonusReportAsync(dto);
                return Ok(new { success = true, data = result });
            }
            catch (ArgumentException ex) { return BadRequest(new { Success = false, Message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { Success = false, Message = ex.Message }); }
        }

        // ── PF Statement ──────────────────────────────────────────────────────

        [HttpPost("pf-statement")]
        public async Task<IActionResult> GetPFStatement([FromBody] PFStatementRequestDTO dto)
        {
            try
            {
                var result = await _reportsSvc.GetPFStatementAsync(dto);
                return Ok(new { success = true, data = result });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { Success = false, Message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { Success = false, Message = ex.Message }); }
        }

        // ── ESIC Statement ────────────────────────────────────────────────────

        [HttpPost("esic-statement")]
        public async Task<IActionResult> GetESICStatement([FromBody] ESICStatementRequestDTO dto)
        {
            try
            {
                var result = await _reportsSvc.GetESICStatementAsync(dto);
                return Ok(new { success = true, data = result });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { Success = false, Message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { Success = false, Message = ex.Message }); }
        }

        // ── Salary Register ───────────────────────────────────────────────────

        [HttpPost("salary-register")]
        public async Task<IActionResult> GetSalaryRegister([FromBody] SalaryRegisterRequestDTO dto)
        {
            try
            {
                var result = await _reportsSvc.GetSalaryRegisterAsync(dto);
                return Ok(new { success = true, data = result });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { Success = false, Message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { Success = false, Message = ex.Message }); }
        }

        // ── Employee Salary Statement ─────────────────────────────────────────

        [HttpPost("emp-salary-statement")]
        public async Task<IActionResult> GetEmpSalaryStatement([FromBody] EmpSalaryStatementRequestDTO dto)
        {
            try
            {
                var result = await _reportsSvc.GetEmpSalaryStatementAsync(dto);
                return Ok(new { success = true, data = result });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { Success = false, Message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { Success = false, Message = ex.Message }); }
        }

        // ── Arrear Report ─────────────────────────────────────────────────────

        [HttpPost("arrear-report")]
        public async Task<IActionResult> GetArrearReport([FromBody] ArrearReportRequestDTO dto)
        {
            try
            {
                var result = await _reportsSvc.GetArrearReportAsync(dto);
                return Ok(new { success = true, data = result });
            }
            catch (ArgumentException ex) { return BadRequest(new { Success = false, Message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { Success = false, Message = ex.Message }); }
        }

        // ── Salary Challan ────────────────────────────────────────────────────

        [HttpPost("salary-challan")]
        public async Task<IActionResult> GetSalaryChallan([FromBody] SalaryChallanRequestDTO dto)
        {
            try
            {
                var result = await _reportsSvc.GetSalaryChallanAsync(dto);
                return Ok(new { success = true, data = result });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { Success = false, Message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { Success = false, Message = ex.Message }); }
        }

        // ── Loan Recovery Detail ──────────────────────────────────────────────

        [HttpPost("loan-recovery-detail")]
        public async Task<IActionResult> GetLoanRecoveryDetail([FromBody] LoanRecoveryDetailRequestDTO dto)
        {
            try
            {
                var result = await _reportsSvc.GetLoanRecoveryDetailAsync(dto);
                return Ok(new { success = true, data = result });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { Success = false, Message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { Success = false, Message = ex.Message }); }
        }

        // ── Salary Voucher List ───────────────────────────────────────────────

        [HttpGet("salary-voucher-list/{branchId}")]
        public async Task<IActionResult> GetSalaryVoucherList(int branchId)
        {
            try
            {
                var result = await _reportsSvc.GetSalaryVoucherListAsync(branchId);
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex) { return StatusCode(500, new { Success = false, Message = ex.Message }); }
        }

        // ── Delete Salary Voucher ─────────────────────────────────────────────

        [HttpDelete("delete-salary")]
        public async Task<IActionResult> DeleteSalary([FromBody] DeleteSalaryRequestDTO dto)
        {
            try
            {
                var msg = await _reportsSvc.DeleteSalaryVoucherAsync(dto);
                return Ok(new { success = true, message = msg });
            }
            catch (KeyNotFoundException ex)     { return NotFound(new { Success = false, Message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { Success = false, Message = ex.Message }); }
            catch (Exception ex)                 { return StatusCode(500, new { Success = false, Message = ex.Message }); }
        }

        // ── Posted Months ─────────────────────────────────────────────────────

        [HttpGet("posted-months/{branchId}")]
        public async Task<IActionResult> GetPostedMonths(int branchId)
        {
            try
            {
                var months = await _reportsSvc.GetPostedMonthsAsync(branchId);
                return Ok(new { success = true, months });
            }
            catch (Exception ex) { return StatusCode(500, new { Success = false, Message = ex.Message }); }
        }
    }
}
