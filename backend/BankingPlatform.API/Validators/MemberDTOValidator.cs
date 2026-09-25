using BankingPlatform.API.DTO.Member;
using FluentValidation;

namespace BankingPlatform.API.Validators;

public class CombinedMemberDTOValidator : AbstractValidator<CombinedMemberDTO>
{
    public CombinedMemberDTOValidator()
    {
        RuleFor(x => x.Member)
            .NotNull().WithMessage("Member details are required.")
            .SetValidator(new MemberDTOValidator()!);
    }
}

public class MemberDTOValidator : AbstractValidator<MemberDTO>
{
    public MemberDTOValidator()
    {
        RuleFor(x => x.BranchId)
            .GreaterThan(0).WithMessage("Branch ID is required.");

        RuleFor(x => x.MemberName)
            .NotEmpty().WithMessage("Member name is required.")
            .MaximumLength(100).WithMessage("Member name cannot exceed 100 characters.");

        RuleFor(x => x.RelativeName)
            .NotEmpty().WithMessage("Relative name is required.")
            .MaximumLength(100).WithMessage("Relative name cannot exceed 100 characters.");

        RuleFor(x => x.RelationId)
            .GreaterThan(0).WithMessage("Relation is required.");

        RuleFor(x => x.CasteId)
            .GreaterThan(0).WithMessage("Caste is required.");

        RuleFor(x => x.CategoryId)
            .GreaterThan(0).WithMessage("Category is required.");

        RuleFor(x => x.OccupationId)
            .GreaterThan(0).WithMessage("Occupation is required.");

        RuleFor(x => x.DOB)
            .Must(d => d.Year >= 1900 && d < DateTime.Today)
            .WithMessage("Date of birth must be a valid past date.");

        RuleFor(x => x.JoiningDate)
            .Must(d => d.Year >= 2000 && d.Year <= 2100)
            .WithMessage("Joining date is out of valid range.");

        RuleFor(x => x.Email1)
            .EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email1))
            .WithMessage("Email address is not valid.");

        RuleFor(x => x.Email2)
            .EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email2))
            .WithMessage("Secondary email address is not valid.");

        RuleFor(x => x.PhoneNo1)
            .MaximumLength(20).When(x => x.PhoneNo1 != null)
            .WithMessage("Phone number cannot exceed 20 characters.");
    }
}
