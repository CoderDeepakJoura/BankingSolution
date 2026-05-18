using BankingPlatform.API.DTO;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Miscalleneous;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.AuditLog
{
    public class AuditLogFilterDto
    {
        public int BranchId { get; set; }
        public string? Module { get; set; }
        public string? Action { get; set; }
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
        public int Id { get; set; }
        public int BranchId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string Module { get; set; } = string.Empty;
        public string EntityName { get; set; } = string.Empty;
        public string? EntityId { get; set; }
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
        public string? IpAddress { get; set; }
        public string? WorkingDate { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class AuditLogService
    {
        private readonly BankingDbContext _db;

        public AuditLogService(BankingDbContext db)
        {
            _db = db;
        }

        public async Task<PaginatedResponse<AuditLogDto>> GetLogsAsync(AuditLogFilterDto filter)
        {
            var query = _db.auditlog
                .Where(a => a.BranchId == filter.BranchId)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(filter.Module))
                query = query.Where(a => a.Module == filter.Module);

            if (!string.IsNullOrWhiteSpace(filter.Action))
                query = query.Where(a => a.Action == filter.Action);

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
                    Id         = a.Id,
                    BranchId   = a.BranchId,
                    UserId     = a.UserId,
                    UserName   = a.UserName,
                    Action     = a.Action,
                    Module     = a.Module,
                    EntityName = a.EntityName,
                    EntityId   = a.EntityId,
                    OldValue   = a.OldValue,
                    NewValue   = a.NewValue,
                    IpAddress  = a.IpAddress,
                    WorkingDate = a.WorkingDate,
                    CreatedAt  = a.CreatedAt,
                })
                .ToListAsync();

            return new PaginatedResponse<AuditLogDto>
            {
                TotalCount = total,
                Items      = items,
            };
        }

        /// <summary>Full history for a single entity record (e.g. one member, one voucher).</summary>
        public async Task<List<AuditLogDto>> GetEntityHistoryAsync(int branchId, string entityName, string entityId)
        {
            return await _db.auditlog
                .Where(a => a.BranchId == branchId
                         && a.EntityName == entityName
                         && a.EntityId == entityId)
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new AuditLogDto
                {
                    Id          = a.Id,
                    BranchId    = a.BranchId,
                    UserId      = a.UserId,
                    UserName    = a.UserName,
                    Action      = a.Action,
                    Module      = a.Module,
                    EntityName  = a.EntityName,
                    EntityId    = a.EntityId,
                    OldValue    = a.OldValue,
                    NewValue    = a.NewValue,
                    IpAddress   = a.IpAddress,
                    WorkingDate = a.WorkingDate,
                    CreatedAt   = a.CreatedAt,
                })
                .ToListAsync();
        }

        /// <summary>Distinct module names for the branch — useful for filter dropdowns.</summary>
        public async Task<List<string>> GetModulesAsync(int branchId)
        {
            return await _db.auditlog
                .Where(a => a.BranchId == branchId)
                .Select(a => a.Module)
                .Distinct()
                .OrderBy(m => m)
                .ToListAsync();
        }
    }
}
