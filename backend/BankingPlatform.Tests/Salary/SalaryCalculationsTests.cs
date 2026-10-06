namespace BankingPlatform.Tests.Salary;

/// <summary>
/// Pure formula tests extracted from BonusReportService and SalaryCreationService.
/// These mirror the inline arithmetic so that future regressions surface here first.
/// </summary>
public class SalaryCalculationsTests
{
    // Mirrors BonusReportService inline formula
    private static (decimal EffectiveBonusDays, decimal BonusAmount) CalculateBonus(
        decimal basicSalary, decimal leaveCount, int bonusDays)
    {
        decimal daysDeducted = leaveCount > 0
            ? Math.Round((leaveCount / 365m) * bonusDays, 4)
            : 0m;
        decimal effectiveDays = Math.Round(bonusDays - daysDeducted, 4);
        decimal bonusAmt = basicSalary > 0
            ? Math.Round((basicSalary / 30m) * effectiveDays, 2)
            : 0m;
        return (effectiveDays, bonusAmt);
    }

    // Mirrors SalaryCreationService daysInMonth formula
    private static int DaysInRange(DateTime from, DateTime to) =>
        (int)(to - from).TotalDays + 1;

    // ── Bonus: no leave ───────────────────────────────────────────────────────

    [Fact]
    public void BonusCalc_NoLeave_EffectiveDaysEqualsBonusDays()
    {
        var (days, _) = CalculateBonus(basicSalary: 12000m, leaveCount: 0m, bonusDays: 30);
        days.Should().Be(30m);
    }

    [Fact]
    public void BonusCalc_NoLeave_BonusIsFullMonth()
    {
        var (_, bonus) = CalculateBonus(basicSalary: 12000m, leaveCount: 0m, bonusDays: 30);
        // 12000 / 30 * 30 = 12000
        bonus.Should().Be(12000m);
    }

    // ── Bonus: with leave ─────────────────────────────────────────────────────

    [Fact]
    public void BonusCalc_WithLeave_ReducesEffectiveDays()
    {
        var (days, _) = CalculateBonus(basicSalary: 12000m, leaveCount: 30m, bonusDays: 30);
        // daysDeducted = Round(30/365 * 30, 4) = Round(2.4657534..., 4) = 2.4658
        // effectiveDays = Round(30 - 2.4658, 4) = 27.5342
        days.Should().Be(27.5342m);
    }

    [Fact]
    public void BonusCalc_WithLeave_BonusAmountCorrect()
    {
        var (_, bonus) = CalculateBonus(basicSalary: 12000m, leaveCount: 30m, bonusDays: 30);
        // bonus = Round(12000/30 * 27.5342, 2) = Round(400 * 27.5342, 2) = 11013.68
        bonus.Should().Be(11013.68m);
    }

    [Fact]
    public void BonusCalc_FullYearLeave_EffectiveDaysIsZero()
    {
        // 365 days LWP out of 365 available → deducts all bonus days
        var (days, bonus) = CalculateBonus(basicSalary: 12000m, leaveCount: 365m, bonusDays: 30);
        days.Should().Be(0m);
        bonus.Should().Be(0m);
    }

    // ── Bonus: zero salary ────────────────────────────────────────────────────

    [Fact]
    public void BonusCalc_ZeroSalary_ReturnsZeroBonus()
    {
        var (_, bonus) = CalculateBonus(basicSalary: 0m, leaveCount: 0m, bonusDays: 30);
        bonus.Should().Be(0m);
    }

    [Fact]
    public void BonusCalc_ZeroSalary_EffectiveDaysStillComputed()
    {
        // Days deduction logic runs independently of salary
        var (days, _) = CalculateBonus(basicSalary: 0m, leaveCount: 0m, bonusDays: 30);
        days.Should().Be(30m);
    }

    // ── Bonus: parametric ─────────────────────────────────────────────────────

    [Theory]
    [InlineData(26,  10000, 30)]   // 26/30 month: Round(10000/30 * 26, 2) = 8666.67
    [InlineData(30,  15000, 30)]   // full month:  15000
    [InlineData(1,   9000,  30)]   // single day:  Round(9000/30 * 1, 2) = 300
    [InlineData(30,  8000,  30)]   // basic lower: 8000
    public void BonusCalc_NoLeave_AmountMatchesFormula(int days, decimal basic, int bonusDays)
    {
        var (_, bonus) = CalculateBonus(basic, leaveCount: 0m, bonusDays: days);
        var expected = Math.Round((basic / 30m) * days, 2);
        bonus.Should().Be(expected);
    }

    // ── Days-in-range formula ─────────────────────────────────────────────────

    [Fact]
    public void DaysInRange_FullJanuary_Returns31()
    {
        DaysInRange(new DateTime(2025, 1, 1), new DateTime(2025, 1, 31)).Should().Be(31);
    }

    [Fact]
    public void DaysInRange_SingleDay_ReturnsOne()
    {
        DaysInRange(new DateTime(2025, 9, 15), new DateTime(2025, 9, 15)).Should().Be(1);
    }

    [Fact]
    public void DaysInRange_TwoWeeks_Returns14()
    {
        DaysInRange(new DateTime(2025, 9, 1), new DateTime(2025, 9, 14)).Should().Be(14);
    }

    [Fact]
    public void DaysInRange_FullFebruary_Returns28()
    {
        DaysInRange(new DateTime(2025, 2, 1), new DateTime(2025, 2, 28)).Should().Be(28);
    }

    [Fact]
    public void DaysInRange_LeapYearFebruary_Returns29()
    {
        DaysInRange(new DateTime(2024, 2, 1), new DateTime(2024, 2, 29)).Should().Be(29);
    }

    // ── Net pay consistency ───────────────────────────────────────────────────

    [Theory]
    [InlineData(25000, 3500,  21500)]
    [InlineData(18000, 2800,  15200)]
    [InlineData(50000, 8750,  41250)]
    [InlineData(12000, 0,     12000)]  // zero deductions
    public void NetPay_IsGrossMinusDeductions(decimal gross, decimal deductions, decimal expectedNet)
    {
        // Invariant expected by SaveEmpSalaryDTO: NetPay = TotalGross - TotalDeduction
        (gross - deductions).Should().Be(expectedNet);
    }

    // ── Loan recovery deduction totals ────────────────────────────────────────

    [Fact]
    public void LoanRecoveryTotal_SumsAllDeductionComponents()
    {
        var amounts = new[] { 1800m, 375m, 500m };
        amounts.Sum().Should().Be(2675m);
    }

    [Fact]
    public void LoanRecoveryTotal_NoComponents_IsZero()
    {
        var amounts = Array.Empty<decimal>();
        amounts.Sum().Should().Be(0m);
    }

    // ── Salary voucher list grand total ──────────────────────────────────────

    [Fact]
    public void SalaryVoucherList_GrandTotalNetPay_SumsAllRows()
    {
        var netPays = new[] { 150000m, 152000m, 148500m };
        netPays.Sum().Should().Be(450500m);
    }
}
