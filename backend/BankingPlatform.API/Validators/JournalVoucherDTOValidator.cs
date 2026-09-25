using BankingPlatform.API.DTO.Voucher.Journal;
using FluentValidation;

namespace BankingPlatform.API.Validators;

public class JournalVoucherDTOValidator : AbstractValidator<JournalVoucherDTO>
{
    public JournalVoucherDTOValidator()
    {
        RuleFor(x => x.BrID)
            .GreaterThan(0).WithMessage("Branch ID is required.");

        RuleFor(x => x.VoucherDate)
            .NotEmpty().WithMessage("Voucher date is required.")
            .Must(d => d.Year >= 2000 && d.Year <= 2100)
            .WithMessage("Voucher date is out of valid range.");

        RuleFor(x => x.Entries)
            .NotEmpty().WithMessage("At least two entries are required.")
            .Must(e => e.Count >= 2).WithMessage("Journal voucher must have at least one debit and one credit entry.")
            .Must(e => e.Count <= 200).WithMessage("Cannot have more than 200 entries in a single journal voucher.");

        RuleFor(x => x.Entries)
            .Must(HaveBalancedEntries)
            .When(x => x.Entries != null && x.Entries.Count >= 2)
            .WithMessage("Journal voucher debit and credit totals must be equal.");

        RuleForEach(x => x.Entries).SetValidator(new JournalVoucherEntryDTOValidator());
    }

    private static bool HaveBalancedEntries(List<JournalVoucherEntryDTO> entries)
    {
        if (entries == null || entries.Count < 2) return true;
        decimal totalCr = entries.Where(e => e.EntryType == "Cr").Sum(e => e.Amount + e.TotalTax);
        decimal totalDr = entries.Where(e => e.EntryType == "Dr").Sum(e => e.Amount);
        // Allow a small rounding tolerance
        return Math.Abs(totalCr - totalDr) < 0.01m;
    }
}

public class JournalVoucherEntryDTOValidator : AbstractValidator<JournalVoucherEntryDTO>
{
    public JournalVoucherEntryDTOValidator()
    {
        RuleFor(x => x.AccountId)
            .GreaterThan(0).WithMessage("Account ID is required.");

        RuleFor(x => x.EntryType)
            .NotEmpty().WithMessage("Entry type is required.")
            .Must(t => t == "Cr" || t == "Dr")
            .WithMessage("Entry type must be 'Cr' or 'Dr'.");

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Amount must be greater than zero.");
    }
}
