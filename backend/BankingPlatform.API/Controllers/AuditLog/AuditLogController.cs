using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.Service.AuditLog;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.AuditLog
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AuditLogController : ControllerBase
    {
        private readonly AuditLogService _service;
        private readonly ILogger<AuditLogController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public AuditLogController(AuditLogService service, ILogger<AuditLogController> logger, CommonFunctions commonFunctions)
        {
            _service = service;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }

        [HttpGet]
        public async Task<IActionResult> GetLogs([FromQuery] AuditLogFilterDto filter)
        {
            try
            {
                var result = await _service.GetLogsAsync(filter);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching audit logs");
                await _commonFunctions.LogErrors(ex, nameof(GetLogs), nameof(AuditLogController));
                return StatusCode(500, new { Success = false, Message = "Error fetching audit logs" });
            }
        }

        [HttpGet("entity/{branchId}/{entityName}/{entityId}")]
        public async Task<IActionResult> GetEntityHistory(int branchId, string entityName, string entityId)
        {
            try
            {
                var result = await _service.GetEntityHistoryAsync(branchId, entityName, entityId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching entity history");
                await _commonFunctions.LogErrors(ex, nameof(GetEntityHistory), nameof(AuditLogController));
                return StatusCode(500, new { Success = false, Message = "Error fetching entity history" });
            }
        }

        [HttpGet("modules/{branchId}")]
        public async Task<IActionResult> GetModules(int branchId)
        {
            try
            {
                var result = await _service.GetModulesAsync(branchId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching audit modules");
                await _commonFunctions.LogErrors(ex, nameof(GetModules), nameof(AuditLogController));
                return StatusCode(500, new { Success = false, Message = "Error fetching audit modules" });
            }
        }
    }
}
