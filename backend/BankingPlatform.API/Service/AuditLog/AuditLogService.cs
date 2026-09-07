using BankingPlatform.API.DTO;
using BankingPlatform.Infrastructure.DbContexts;
using BankingPlatform.Infrastructure.Interfaces;
using BankingPlatform.Infrastructure.Models.Miscalleneous;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using AuditLogModel = BankingPlatform.Infrastructure.Models.Miscalleneous.AuditLog;

namespace BankingPlatform.API.Service.AuditLog
{
    // ── Filter / response DTOs ────────────────────────────────────────────────

    public class AuditLogFilterDto
    {
        public int BranchId { get; set; }
        public string? SocietyCode { get; set; }
        public string? Module { get; set; }
        public string? ActionType { get; set; }
        public string? Screen { get; set; }
        public string? EntityName { get; set; }
        public string? UserId { get; set; }
        public string? UserName { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
    }

    public class AuditLogDto
    {
        public long Id { get; set; }
        public string SocietyCode { get; set; } = string.Empty;
        public int BranchId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string ActionType { get; set; } = string.Empty;
        public string Module { get; set; } = string.Empty;
        public string? Screen { get; set; }
        public string? EntityName { get; set; }
        public string? EntityId { get; set; }
        public string? Description { get; set; }
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
        public string? IpAddress { get; set; }
        public string? WorkingDate { get; set; }
        public string? SessionId { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ── Interface ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Write interface — BankingDbContext depends on this to ship CUD audit
    /// entries to the separate audit database without importing AuditDbContext.
    /// Controllers call it directly for OPEN / VIEW / SEARCH / LOGIN / LOGOUT.
    /// </summary>
    public interface IAuditService
    {
        /// <summary>
        /// Bulk-write pre-built entries (called by BankingDbContext.SaveChangesAsync
        /// after a successful CUD operation).
        /// </summary>
        Task LogBulkAsync(IEnumerable<AuditLogModel> entries);

        /// <summary>
        /// Log a single user action from a controller (OPEN, VIEW, SEARCH, EXPORT, PRINT, LOGIN, LOGOUT).
        /// All context (userId, branchId, IP, working date) is resolved from the current HTTP request.
        /// </summary>
        Task LogActionAsync(
            string actionType,
            string module,
            string screen,
            string? entityName = null,
            string? entityId = null,
            string? description = null);
    }

    // ── Implementation ────────────────────────────────────────────────────────

    public class AuditLogService : IAuditService, IAuditWriter
    {
        private readonly AuditDbContext _audit;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IConfiguration _config;
        private readonly ILogger<AuditLogService> _logger;

        public AuditLogService(
            AuditDbContext audit,
            IHttpContextAccessor httpContextAccessor,
            IConfiguration config,
            ILogger<AuditLogService> logger)
        {
            _audit = audit;
            _httpContextAccessor = httpContextAccessor;
            _config = config;
            _logger = logger;
        }

        // ── Write ─────────────────────────────────────────────────────────────

        public async Task LogBulkAsync(IEnumerable<AuditLogModel> entries)
        {
            try
            {
                var societyCode = GetSocietyCode();
                foreach (var e in entries)
                    e.SocietyCode = societyCode;

                _audit.auditlog.AddRange(entries);
                await _audit.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Audit failures must never break the main business operation
                _logger.LogError(ex, "Failed to write audit log entries");
            }
        }

        public async Task LogActionAsync(
            string actionType,
            string module,
            string screen,
            string? entityName = null,
            string? entityId = null,
            string? description = null)
        {
            try
            {
                var ctx = GetRequestContext();
                var entry = new AuditLogModel
                {
                    SocietyCode = GetSocietyCode(),
                    BranchId    = ctx.BranchId,
                    UserId      = ctx.UserId,
                    UserName    = ctx.UserName,
                    ActionType  = actionType,
                    Module      = module,
                    Screen      = screen,
                    EntityName  = entityName,
                    EntityId    = entityId,
                    Description = description,
                    IpAddress   = ctx.IpAddress,
                    WorkingDate = ctx.WorkingDate,
                    SessionId   = ctx.SessionId,
                    CreatedAt   = DateTime.Now,
                };
                _audit.auditlog.Add(entry);
                await _audit.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to write audit action log");
            }
        }

        // ── Read ──────────────────────────────────────────────────────────────

        public async Task<PaginatedResponse<AuditLogDto>> GetLogsAsync(AuditLogFilterDto filter)
        {
            // Always scope to the current society; caller may not know the code
            var societyCode = string.IsNullOrWhiteSpace(filter.SocietyCode)
                ? GetSocietyCode() : filter.SocietyCode;

            var query = _audit.auditlog.AsNoTracking()
                .Where(a => a.SocietyCode == societyCode)
                .AsQueryable();

            if (filter.BranchId > 0)
                query = query.Where(a => a.BranchId == filter.BranchId);

            if (!string.IsNullOrWhiteSpace(filter.Module))
                query = query.Where(a => a.Module == filter.Module);

            if (!string.IsNullOrWhiteSpace(filter.ActionType))
                query = query.Where(a => a.ActionType == filter.ActionType);

            if (!string.IsNullOrWhiteSpace(filter.Screen))
                query = query.Where(a => EF.Functions.ILike(a.Screen!, $"%{filter.Screen}%"));

            if (!string.IsNullOrWhiteSpace(filter.EntityName))
                query = query.Where(a => a.EntityName == filter.EntityName);

            if (!string.IsNullOrWhiteSpace(filter.UserId))
                query = query.Where(a => a.UserId == filter.UserId);

            if (!string.IsNullOrWhiteSpace(filter.UserName))
                query = query.Where(a => EF.Functions.ILike(a.UserName, $"%{filter.UserName}%"));

            if (filter.FromDate.HasValue)
                query = query.Where(a => a.CreatedAt >= filter.FromDate.Value);

            if (filter.ToDate.HasValue)
                query = query.Where(a => a.CreatedAt < filter.ToDate.Value.AddDays(1));

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(a => new AuditLogDto
                {
                    Id          = a.Id,
                    SocietyCode = a.SocietyCode,
                    BranchId    = a.BranchId,
                    UserId      = a.UserId,
                    UserName    = a.UserName,
                    ActionType  = a.ActionType,
                    Module      = a.Module,
                    Screen      = a.Screen,
                    EntityName  = a.EntityName,
                    EntityId    = a.EntityId,
                    Description = a.Description,
                    OldValue    = a.OldValue,
                    NewValue    = a.NewValue,
                    IpAddress   = a.IpAddress,
                    WorkingDate = a.WorkingDate,
                    SessionId   = a.SessionId,
                    CreatedAt   = a.CreatedAt,
                })
                .ToListAsync();

            return new PaginatedResponse<AuditLogDto> { TotalCount = total, Items = items };
        }

        public async Task<List<AuditLogDto>> GetEntityHistoryAsync(int branchId, string entityName, string entityId)
        {
            var societyCode = GetSocietyCode();
            return await _audit.auditlog.AsNoTracking()
                .Where(a => a.SocietyCode == societyCode
                         && a.BranchId    == branchId
                         && a.EntityName  == entityName
                         && a.EntityId    == entityId)
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new AuditLogDto
                {
                    Id          = a.Id,
                    SocietyCode = a.SocietyCode,
                    BranchId    = a.BranchId,
                    UserId      = a.UserId,
                    UserName    = a.UserName,
                    ActionType  = a.ActionType,
                    Module      = a.Module,
                    Screen      = a.Screen,
                    EntityName  = a.EntityName,
                    EntityId    = a.EntityId,
                    Description = a.Description,
                    OldValue    = a.OldValue,
                    NewValue    = a.NewValue,
                    IpAddress   = a.IpAddress,
                    WorkingDate = a.WorkingDate,
                    SessionId   = a.SessionId,
                    CreatedAt   = a.CreatedAt,
                })
                .ToListAsync();
        }

        public async Task<List<string>> GetModulesAsync(int branchId)
        {
            var societyCode = GetSocietyCode();
            return await _audit.auditlog.AsNoTracking()
                .Where(a => a.SocietyCode == societyCode && a.BranchId == branchId)
                .Select(a => a.Module)
                .Distinct()
                .OrderBy(m => m)
                .ToListAsync();
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private string GetSocietyCode() =>
            _config.GetConnectionString("BankingDatabase")
                   ?.Split(';', StringSplitOptions.RemoveEmptyEntries)
                   .FirstOrDefault(s => s.TrimStart().StartsWith("Database=", StringComparison.OrdinalIgnoreCase))
                   ?.Split('=', 2).LastOrDefault()?.Trim()
            ?? "unknown";

        private RequestContext GetRequestContext()
        {
            var http = _httpContextAccessor.HttpContext;
            if (http is null) return new RequestContext();

            var user = http.User;
            int.TryParse(user.FindFirst("branchId")?.Value, out var branchId);

            return new RequestContext
            {
                BranchId    = branchId,
                UserId      = user.FindFirst("userId")?.Value ?? "",
                UserName    = user.FindFirst(ClaimTypes.Name)?.Value ?? "",
                WorkingDate = user.FindFirst("workingDate")?.Value ?? "",
                IpAddress   = http.Connection.RemoteIpAddress?.ToString() ?? "",
                SessionId   = user.FindFirst("sessionId")?.Value
                              ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            };
        }

        private sealed record RequestContext
        {
            public int    BranchId    { get; init; }
            public string UserId      { get; init; } = "";
            public string UserName    { get; init; } = "";
            public string WorkingDate { get; init; } = "";
            public string IpAddress   { get; init; } = "";
            public string? SessionId  { get; init; }
        }
    }
}
