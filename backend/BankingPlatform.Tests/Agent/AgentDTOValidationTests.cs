using System.ComponentModel.DataAnnotations;
using BankingPlatform.API.DTO.Agent;

namespace BankingPlatform.Tests.Agent;

public class AgentDTOValidationTests
{
    private static IList<ValidationResult> Validate(object dto)
    {
        var ctx = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(dto, ctx, results, validateAllProperties: true);
        return results;
    }

    // ── AgentLevelDTO ─────────────────────────────────────────────────────────

    [Fact]
    public void AgentLevelDTO_ValidValues_PassesValidation()
    {
        var dto = new AgentLevelDTO { BranchId = 1, Code = "L1", Description = "Level One" };
        Validate(dto).Should().BeEmpty();
    }

    [Fact]
    public void AgentLevelDTO_EmptyCode_FailsValidation()
    {
        var dto = new AgentLevelDTO { BranchId = 1, Code = "", Description = "Level One" };
        Validate(dto).Should().ContainSingle(r => r.MemberNames.Contains(nameof(AgentLevelDTO.Code)));
    }

    [Fact]
    public void AgentLevelDTO_CodeAtMaxLength20_PassesValidation()
    {
        var dto = new AgentLevelDTO { BranchId = 1, Code = new string('X', 20), Description = "Level One" };
        Validate(dto).Should().BeEmpty();
    }

    [Fact]
    public void AgentLevelDTO_CodeTooLong_FailsValidation()
    {
        var dto = new AgentLevelDTO { BranchId = 1, Code = new string('X', 21), Description = "Level One" };
        Validate(dto).Should().ContainSingle(r => r.MemberNames.Contains(nameof(AgentLevelDTO.Code)));
    }

    [Fact]
    public void AgentLevelDTO_EmptyDescription_FailsValidation()
    {
        var dto = new AgentLevelDTO { BranchId = 1, Code = "L1", Description = "" };
        Validate(dto).Should().ContainSingle(r => r.MemberNames.Contains(nameof(AgentLevelDTO.Description)));
    }

    [Fact]
    public void AgentLevelDTO_DescriptionAtMaxLength150_PassesValidation()
    {
        var dto = new AgentLevelDTO { BranchId = 1, Code = "L1", Description = new string('D', 150) };
        Validate(dto).Should().BeEmpty();
    }

    [Fact]
    public void AgentLevelDTO_DescriptionTooLong_FailsValidation()
    {
        var dto = new AgentLevelDTO { BranchId = 1, Code = "L1", Description = new string('D', 151) };
        Validate(dto).Should().ContainSingle(r => r.MemberNames.Contains(nameof(AgentLevelDTO.Description)));
    }

    [Fact]
    public void AgentLevelDTO_NullParentLevelId_PassesValidation()
    {
        var dto = new AgentLevelDTO { BranchId = 1, Code = "L1", Description = "Level One", ParentLevelId = null };
        Validate(dto).Should().BeEmpty();
    }

    [Fact]
    public void AgentLevelDTO_WithParentLevelId_PassesValidation()
    {
        var dto = new AgentLevelDTO { BranchId = 1, Code = "L2", Description = "Level Two", ParentLevelId = 5 };
        Validate(dto).Should().BeEmpty();
    }

    // ── AgentMasterDTO ────────────────────────────────────────────────────────

    [Fact]
    public void AgentMasterDTO_ValidValues_PassesValidation()
    {
        var dto = new AgentMasterDTO { BranchId = 1, Code = "AG01", Name = "Ramesh Kumar", Phone = "9876543210", Address = "123 Main St" };
        Validate(dto).Should().BeEmpty();
    }

    [Fact]
    public void AgentMasterDTO_EmptyCode_FailsValidation()
    {
        var dto = new AgentMasterDTO { BranchId = 1, Code = "", Name = "Ramesh Kumar" };
        Validate(dto).Should().ContainSingle(r => r.MemberNames.Contains(nameof(AgentMasterDTO.Code)));
    }

    [Fact]
    public void AgentMasterDTO_CodeAtMaxLength20_PassesValidation()
    {
        var dto = new AgentMasterDTO { BranchId = 1, Code = new string('A', 20), Name = "Ramesh Kumar" };
        Validate(dto).Should().BeEmpty();
    }

    [Fact]
    public void AgentMasterDTO_CodeTooLong_FailsValidation()
    {
        var dto = new AgentMasterDTO { BranchId = 1, Code = new string('A', 21), Name = "Ramesh Kumar" };
        Validate(dto).Should().ContainSingle(r => r.MemberNames.Contains(nameof(AgentMasterDTO.Code)));
    }

    [Fact]
    public void AgentMasterDTO_EmptyName_FailsValidation()
    {
        var dto = new AgentMasterDTO { BranchId = 1, Code = "AG01", Name = "" };
        Validate(dto).Should().ContainSingle(r => r.MemberNames.Contains(nameof(AgentMasterDTO.Name)));
    }

    [Fact]
    public void AgentMasterDTO_NameAtMaxLength150_PassesValidation()
    {
        var dto = new AgentMasterDTO { BranchId = 1, Code = "AG01", Name = new string('N', 150) };
        Validate(dto).Should().BeEmpty();
    }

    [Fact]
    public void AgentMasterDTO_NameTooLong_FailsValidation()
    {
        var dto = new AgentMasterDTO { BranchId = 1, Code = "AG01", Name = new string('N', 151) };
        Validate(dto).Should().ContainSingle(r => r.MemberNames.Contains(nameof(AgentMasterDTO.Name)));
    }

    [Fact]
    public void AgentMasterDTO_PhoneTooLong_FailsValidation()
    {
        var dto = new AgentMasterDTO { BranchId = 1, Code = "AG01", Name = "Ramesh Kumar", Phone = new string('9', 21) };
        Validate(dto).Should().ContainSingle(r => r.MemberNames.Contains(nameof(AgentMasterDTO.Phone)));
    }

    [Fact]
    public void AgentMasterDTO_AddressTooLong_FailsValidation()
    {
        var dto = new AgentMasterDTO { BranchId = 1, Code = "AG01", Name = "Ramesh Kumar", Address = new string('X', 201) };
        Validate(dto).Should().ContainSingle(r => r.MemberNames.Contains(nameof(AgentMasterDTO.Address)));
    }

    [Fact]
    public void AgentMasterDTO_IsActiveDefaultsToTrue()
    {
        var dto = new AgentMasterDTO();
        dto.IsActive.Should().BeTrue();
    }

    [Fact]
    public void AgentMasterDTO_NoAgentLevelId_PassesValidation()
    {
        var dto = new AgentMasterDTO { BranchId = 1, Code = "AG01", Name = "Ramesh Kumar", AgentLevelId = null };
        Validate(dto).Should().BeEmpty();
    }

    // ── TransferAgentDTO ──────────────────────────────────────────────────────

    [Fact]
    public void TransferAgentDTO_Defaults_EmptyAccountIdsList()
    {
        var dto = new TransferAgentDTO();
        dto.AccountIds.Should().NotBeNull().And.BeEmpty();
    }

    [Fact]
    public void TransferAgentDTO_Defaults_EmptyEffectiveDate()
    {
        var dto = new TransferAgentDTO();
        dto.EffectiveDate.Should().BeEmpty();
    }

    [Fact]
    public void TransferAgentDTO_SameFromAndTo_IsDetectableByCallers()
    {
        // The service returns an error string when FromAgentId == ToAgentId.
        // Ensure the DTO itself allows both fields to be set to the same value
        // so the service can enforce this rule (not the DTO).
        var dto = new TransferAgentDTO { BranchId = 1, FromAgentId = 5, ToAgentId = 5 };
        dto.FromAgentId.Should().Be(dto.ToAgentId);
    }

    [Fact]
    public void TransferAgentDTO_AccountIds_CanAccumulateItems()
    {
        var dto = new TransferAgentDTO { BranchId = 1, FromAgentId = 1, ToAgentId = 2, EffectiveDate = "2026-04-01" };
        dto.AccountIds.AddRange(new[] { 101, 102, 103 });
        dto.AccountIds.Should().HaveCount(3).And.Contain(101).And.Contain(102).And.Contain(103);
    }

    // ── AgentFilterDTO ────────────────────────────────────────────────────────

    [Fact]
    public void AgentFilterDTO_Defaults_PageNumberOneAndPageSizeTwenty()
    {
        var dto = new AgentFilterDTO();
        dto.PageNumber.Should().Be(1);
        dto.PageSize.Should().Be(20);
        dto.SearchTerm.Should().BeEmpty();
    }

    [Fact]
    public void AgentFilterDTO_SearchTermCanBeSet()
    {
        var dto = new AgentFilterDTO { SearchTerm = "Ramesh" };
        dto.SearchTerm.Should().Be("Ramesh");
    }

    // ── AccountAgentDTO ───────────────────────────────────────────────────────

    [Fact]
    public void AccountAgentDTO_ToDatNullMeansCurrentAssignment()
    {
        // A null ToDate is the sentinel for "this is the current/active assignment"
        var dto = new AccountAgentDTO { AgentId = 7, FromDate = "2026-04-01", ToDate = null };
        dto.ToDate.Should().BeNull();
    }

    [Fact]
    public void AccountAgentDTO_ClosedAssignment_HasToDate()
    {
        var dto = new AccountAgentDTO { AgentId = 3, FromDate = "2024-04-01", ToDate = "2026-03-31" };
        dto.ToDate.Should().Be("2026-03-31");
    }
}
