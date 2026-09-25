using BankingPlatform.API.DTO.Voucher.RD;
using FluentValidation;

namespace BankingPlatform.API.Validators;

public class RDKistVoucherDTOValidator : AbstractValidator<RDKistVoucherDTO>
{
    public RDKistVoucherDTOValidator()
    {
        RuleFor(x => x.BrID)
            .GreaterThan(0).WithMessage("Branch ID is required.");

        RuleFor(x => x.VoucherDate)
            .Must(d => d.Year >= 2000 && d.Year <= 2100)
            .WithMessage("Voucher date is out of valid range.");

        RuleFor(x => x.RdAccountId)
            .GreaterThan(0).WithMessage("RD account is required.");

        RuleFor(x => x.TotalAmount)
            .GreaterThan(0).WithMessage("Total amount must be greater than zero.")
            .LessThanOrEqualTo(99_999_999m).WithMessage("Total amount exceeds maximum allowed value.");

        RuleFor(x => x.KistAmount)
            .GreaterThanOrEqualTo(0).WithMessage("Kist amount cannot be negative.");

        RuleFor(x => x.PenaltyAmount)
            .GreaterThanOrEqualTo(0).WithMessage("Penalty amount cannot be negative.");

        RuleFor(x => x.VoucherNarration)
            .MaximumLength(500).When(x => x.VoucherNarration != null)
            .WithMessage("Narration cannot exceed 500 characters.");

        // At least one payment source must be provided
        RuleFor(x => x)
            .Must(x => (x.DebitAccountId.HasValue && x.DebitAccountId > 0)
                    || (x.SavingAccountId.HasValue && x.SavingAccountId > 0))
            .WithMessage("A debit account or saving account must be specified as payment source.");
    }
}

public class RDMultipleKistVoucherDTOValidator : AbstractValidator<RDMultipleKistVoucherDTO>
{
    public RDMultipleKistVoucherDTOValidator()
    {
        RuleFor(x => x.BrID)
            .GreaterThan(0).WithMessage("Branch ID is required.");

        RuleFor(x => x.VoucherDate)
            .Must(d => d.Year >= 2000 && d.Year <= 2100)
            .WithMessage("Voucher date is out of valid range.");

        RuleFor(x => x.DebitAccountId)
            .GreaterThan(0).WithMessage("Debit account is required.");

        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("At least one RD account must be included.")
            .Must(items => items.Count <= 500).WithMessage("Cannot process more than 500 RD accounts at once.");

        RuleForEach(x => x.Items).SetValidator(new RDMultipleKistItemDTOValidator());
    }
}

public class RDMultipleKistItemDTOValidator : AbstractValidator<RDMultipleKistItemDTO>
{
    public RDMultipleKistItemDTOValidator()
    {
        RuleFor(x => x.RdAccountId)
            .GreaterThan(0).WithMessage("RD account ID is required.");

        RuleFor(x => x.KistAmount)
            .GreaterThan(0).WithMessage("Kist amount must be greater than zero.");
    }
}
