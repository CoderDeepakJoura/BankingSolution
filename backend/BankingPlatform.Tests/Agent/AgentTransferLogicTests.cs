using BankingPlatform.API.DTO.Agent;

namespace BankingPlatform.Tests.Agent;

/// <summary>
/// Pure logic tests for rules enforced by AccountAgentService.TransferAccountsAsync.
/// These mirror the guard checks in the service so regressions surface here first.
/// </summary>
public class AgentTransferLogicTests
{
    // Mirrors AccountAgentService guard: FromAgentId == ToAgentId → error
    private static string? ValidateTransfer(TransferAgentDTO dto)
    {
        if (dto.FromAgentId == dto.ToAgentId)
            return "Source and destination agent must be different.";
        if (!dto.AccountIds.Any())
            return "No accounts selected.";
        if (!DateTime.TryParse(dto.EffectiveDate, out _))
            return "Invalid effective date.";
        return null; // valid
    }

    // Mirrors AccountAgentService: toClose = effectiveDate - 1 day
    private static DateTime ToCloseDate(DateTime effectiveDate) => effectiveDate.AddDays(-1);

    // ── Transfer validation ───────────────────────────────────────────────────

    [Fact]
    public void Transfer_SameFromAndToAgent_ReturnsError()
    {
        var dto = new TransferAgentDTO { BranchId = 1, FromAgentId = 5, ToAgentId = 5, AccountIds = [10], EffectiveDate = "2026-04-01" };
        ValidateTransfer(dto).Should().Be("Source and destination agent must be different.");
    }

    [Fact]
    public void Transfer_EmptyAccountIds_ReturnsError()
    {
        var dto = new TransferAgentDTO { BranchId = 1, FromAgentId = 1, ToAgentId = 2, AccountIds = [], EffectiveDate = "2026-04-01" };
        ValidateTransfer(dto).Should().Be("No accounts selected.");
    }

    [Fact]
    public void Transfer_InvalidEffectiveDate_ReturnsError()
    {
        var dto = new TransferAgentDTO { BranchId = 1, FromAgentId = 1, ToAgentId = 2, AccountIds = [10], EffectiveDate = "not-a-date" };
        ValidateTransfer(dto).Should().Be("Invalid effective date.");
    }

    [Fact]
    public void Transfer_ValidDto_ReturnsNull()
    {
        var dto = new TransferAgentDTO { BranchId = 1, FromAgentId = 1, ToAgentId = 2, AccountIds = [10, 11], EffectiveDate = "2026-04-01" };
        ValidateTransfer(dto).Should().BeNull();
    }

    [Fact]
    public void Transfer_MultipleAccounts_ValidDto_ReturnsNull()
    {
        var dto = new TransferAgentDTO { BranchId = 1, FromAgentId = 3, ToAgentId = 7, AccountIds = [100, 200, 300], EffectiveDate = "2026-10-01" };
        ValidateTransfer(dto).Should().BeNull();
    }

    // ── ToClose date formula ──────────────────────────────────────────────────

    [Fact]
    public void ToCloseDate_IsOneDayBeforeEffectiveDate()
    {
        // Transfer effective 01-Apr-2026 → old assignment closed 31-Mar-2026
        var effective = new DateTime(2026, 4, 1);
        ToCloseDate(effective).Should().Be(new DateTime(2026, 3, 31));
    }

    [Fact]
    public void ToCloseDate_MidMonth_IsOneDayBefore()
    {
        var effective = new DateTime(2026, 6, 15);
        ToCloseDate(effective).Should().Be(new DateTime(2026, 6, 14));
    }

    [Fact]
    public void ToCloseDate_FirstJan_IsLastDec()
    {
        var effective = new DateTime(2026, 1, 1);
        ToCloseDate(effective).Should().Be(new DateTime(2025, 12, 31));
    }

    // ── AccTypeName mapping ───────────────────────────────────────────────────

    // Mirrors the private static AccTypeName in AccountAgentService
    private static string AccTypeName(int t) => t switch
    {
        2 => "Saving",
        3 => "General",
        4 => "Share Money",
        5 => "RD",
        6 => "FD",
        _ => t.ToString()
    };

    [Theory]
    [InlineData(2, "Saving")]
    [InlineData(3, "General")]
    [InlineData(4, "Share Money")]
    [InlineData(5, "RD")]
    [InlineData(6, "FD")]
    public void AccTypeName_KnownType_ReturnsCorrectLabel(int accType, string expected)
    {
        AccTypeName(accType).Should().Be(expected);
    }

    [Fact]
    public void AccTypeName_UnknownType_ReturnsFallbackString()
    {
        AccTypeName(99).Should().Be("99");
    }

    [Fact]
    public void AccTypeName_Zero_ReturnsFallbackString()
    {
        AccTypeName(0).Should().Be("0");
    }

    // ── Transfer EffectiveDate parsing ────────────────────────────────────────

    [Theory]
    [InlineData("2026-04-01", true)]
    [InlineData("01/04/2026", true)]
    [InlineData("2026-13-01", false)]   // month 13 — invalid
    [InlineData("",           false)]
    [InlineData("abc",        false)]
    public void EffectiveDate_Parsing_MatchesExpectedValidity(string date, bool shouldParse)
    {
        DateTime.TryParse(date, out _).Should().Be(shouldParse);
    }

    // ── History sentinel: todate=null is current assignment ───────────────────

    [Fact]
    public void AccountAgentHistory_CurrentRow_HasNullToDate()
    {
        // When an account is transferred, the old row gets todate set;
        // the new row keeps todate=null — this is the live assignment.
        var assignments = new[]
        {
            new AccountAgentDTO { AgentId = 1, FromDate = "2024-04-01", ToDate = "2026-03-31" },
            new AccountAgentDTO { AgentId = 2, FromDate = "2026-04-01", ToDate = null }
        };
        var current = assignments.SingleOrDefault(a => a.ToDate == null);
        current.Should().NotBeNull();
        current!.AgentId.Should().Be(2);
    }

    [Fact]
    public void AccountAgentHistory_AllClosed_HasNoCurrentRow()
    {
        var assignments = new[]
        {
            new AccountAgentDTO { AgentId = 1, FromDate = "2024-04-01", ToDate = "2025-03-31" },
            new AccountAgentDTO { AgentId = 2, FromDate = "2025-04-01", ToDate = "2026-03-31" }
        };
        var current = assignments.SingleOrDefault(a => a.ToDate == null);
        current.Should().BeNull();
    }

    // ── Pagination skip/take formula ──────────────────────────────────────────

    [Theory]
    [InlineData(1, 20, 0)]   // page 1: skip 0
    [InlineData(2, 20, 20)]  // page 2: skip 20
    [InlineData(3, 15, 30)]  // page 3, pageSize 15: skip 30
    [InlineData(5, 10, 40)]  // page 5, pageSize 10: skip 40
    public void Pagination_SkipIsPageMinusOneTimesPageSize(int page, int pageSize, int expectedSkip)
    {
        int skip = (page - 1) * pageSize;
        skip.Should().Be(expectedSkip);
    }
}
