using BankingPlatform.API.Common;

namespace BankingPlatform.API.Service.Masters;

public enum MasterType
{
    AccountHeadType,
    AccountHead,
    Caste,
    Category,
    Occupation,
    Relation,
    State,
    Patwar,
    PostOffice,
    Tehsil,
    Thana,
    Village,
    Zone,
    SavingProduct,
    FDProduct,
    RDProduct,
    LoanProduct
}

public class UsageInfo
{
    public string Screen { get; set; } = "";
    public int Count { get; set; }
}

public class MasterUsageCheckerService
{
    private readonly BankingDbContext _context;

    public MasterUsageCheckerService(BankingDbContext context)
    {
        _context = context;
    }

    public async Task<List<UsageInfo>> CheckAsync(MasterType type, int id, int branchId)
    {
        var usages = new List<UsageInfo>();

        switch (type)
        {
            case MasterType.AccountHeadType:
            {
                int count = await _context.accounthead.CountAsync(x => x.branchid == branchId && x.accountheadtypeid == id);
                if (count > 0) usages.Add(new UsageInfo { Screen = "Account Head", Count = count });
                break;
            }

            case MasterType.AccountHead:
            {
                int c1 = await _context.accountmaster.CountAsync(x => x.BranchId == branchId && x.HeadId == id);
                if (c1 > 0) usages.Add(new UsageInfo { Screen = "Account Master", Count = c1 });

                int c2 = await _context.accounthead.CountAsync(x => x.branchid == branchId && x.parentid == id);
                if (c2 > 0) usages.Add(new UsageInfo { Screen = "Child Account Heads", Count = c2 });
                break;
            }

            case MasterType.Caste:
            {
                int count = await _context.member.CountAsync(x => x.BranchId == branchId && x.CasteId == id);
                if (count > 0) usages.Add(new UsageInfo { Screen = "Member Master", Count = count });
                break;
            }

            case MasterType.Category:
            {
                int c1 = await _context.member.CountAsync(x => x.BranchId == branchId && x.CategoryId == id);
                if (c1 > 0) usages.Add(new UsageInfo { Screen = "Member Master", Count = c1 });

                int c2 = await _context.caste.CountAsync(x => x.branchid == branchId && x.categoryid == id);
                if (c2 > 0) usages.Add(new UsageInfo { Screen = "Caste Master", Count = c2 });

                int c3 = await _context.accountheadtype.CountAsync(x => x.branchid == branchId && x.categoryid == id);
                if (c3 > 0) usages.Add(new UsageInfo { Screen = "Account Head Type", Count = c3 });
                break;
            }

            case MasterType.Occupation:
            {
                int count = await _context.member.CountAsync(x => x.BranchId == branchId && x.OccupationId == id);
                if (count > 0) usages.Add(new UsageInfo { Screen = "Member Master", Count = count });
                break;
            }

            case MasterType.Relation:
            {
                int c1 = await _context.member.CountAsync(x => x.BranchId == branchId && x.RelationId == id);
                if (c1 > 0) usages.Add(new UsageInfo { Screen = "Member Master", Count = c1 });

                int c2 = await _context.membernomineedetails.CountAsync(x => x.BranchId == branchId && x.RelationId == id);
                if (c2 > 0) usages.Add(new UsageInfo { Screen = "Member Nominees", Count = c2 });
                break;
            }

            case MasterType.State:
            {
                int c1 = await _context.accgstinfo.CountAsync(x => x.StateId == id);
                if (c1 > 0) usages.Add(new UsageInfo { Screen = "Account GST Info", Count = c1 });

                int c2 = await _context.branchmaster.CountAsync(x => x.branchmaster_stateid == id);
                if (c2 > 0) usages.Add(new UsageInfo { Screen = "Branch Master", Count = c2 });
                break;
            }

            case MasterType.Patwar:
            {
                int count = await _context.village.CountAsync(x => x.branchid == branchId && x.patwarId == id);
                if (count > 0) usages.Add(new UsageInfo { Screen = "Village Master", Count = count });
                break;
            }

            case MasterType.PostOffice:
            {
                int c1 = await _context.village.CountAsync(x => x.branchid == branchId && x.postofficeid == id);
                if (c1 > 0) usages.Add(new UsageInfo { Screen = "Village Master", Count = c1 });

                int c2 = await _context.memberlocationdetails.CountAsync(x => x.BranchId == branchId && (x.PO1 == id || x.PO2 == id));
                if (c2 > 0) usages.Add(new UsageInfo { Screen = "Member Address", Count = c2 });
                break;
            }

            case MasterType.Tehsil:
            {
                int c1 = await _context.village.CountAsync(x => x.branchid == branchId && x.tehsilid == id);
                if (c1 > 0) usages.Add(new UsageInfo { Screen = "Village Master", Count = c1 });

                int c2 = await _context.memberlocationdetails.CountAsync(x => x.BranchId == branchId && (x.Tehsil1 == id || x.Tehsil2 == id));
                if (c2 > 0) usages.Add(new UsageInfo { Screen = "Member Address", Count = c2 });

                int c3 = await _context.branchmaster.CountAsync(x => x.branchmaster_tehsilid == id);
                if (c3 > 0) usages.Add(new UsageInfo { Screen = "Branch Master", Count = c3 });
                break;
            }

            case MasterType.Thana:
            {
                int c1 = await _context.village.CountAsync(x => x.branchid == branchId && x.thanaid == id);
                if (c1 > 0) usages.Add(new UsageInfo { Screen = "Village Master", Count = c1 });

                int c2 = await _context.memberlocationdetails.CountAsync(x => x.BranchId == branchId && (x.ThanaId1 == id || x.ThanaId2 == id));
                if (c2 > 0) usages.Add(new UsageInfo { Screen = "Member Address", Count = c2 });
                break;
            }

            case MasterType.Village:
            {
                int count = await _context.memberlocationdetails.CountAsync(x => x.BranchId == branchId && (x.VillageId1 == id || x.VillageId2 == id));
                if (count > 0) usages.Add(new UsageInfo { Screen = "Member Address", Count = count });
                break;
            }

            case MasterType.Zone:
            {
                int c1 = await _context.village.CountAsync(x => x.branchid == branchId && x.zoneid == id);
                if (c1 > 0) usages.Add(new UsageInfo { Screen = "Village Master", Count = c1 });

                int c2 = await _context.memberlocationdetails.CountAsync(x => x.BranchId == branchId && (x.ZoneId1 == id || x.ZoneId2 == id));
                if (c2 > 0) usages.Add(new UsageInfo { Screen = "Member Address", Count = c2 });
                break;
            }

            case MasterType.SavingProduct:
            {
                int c1 = await _context.accountmaster.CountAsync(x => x.BranchId == branchId && x.GeneralProductId == id && x.AccTypeId == (int)Enums.AccountTypes.Saving);
                if (c1 > 0) usages.Add(new UsageInfo { Screen = "Saving Account Master", Count = c1 });

                int c2 = await _context.savingproductbranchwiserule.CountAsync(x => x.BranchId == branchId && x.SavingProductId == id);
                if (c2 > 0) usages.Add(new UsageInfo { Screen = "Branch-wise Rules", Count = c2 });

                int c3 = await _context.savinginterestslab.CountAsync(x => x.BranchId == branchId && x.SavingProductId == id);
                if (c3 > 0) usages.Add(new UsageInfo { Screen = "Interest Slabs", Count = c3 });
                break;
            }

            case MasterType.FDProduct:
            {
                int c1 = await _context.accountmaster.CountAsync(x => x.BranchId == branchId && x.GeneralProductId == id && x.AccTypeId == (int)Enums.AccountTypes.FD);
                if (c1 > 0) usages.Add(new UsageInfo { Screen = "FD Account Master", Count = c1 });

                int c2 = await _context.fdproductbranchwiserule.CountAsync(x => x.BranchId == branchId && x.FDProductId == id);
                if (c2 > 0) usages.Add(new UsageInfo { Screen = "Branch-wise Rules", Count = c2 });

                int c3 = await _context.fdinterestslab.CountAsync(x => x.BranchId == branchId && x.FDProductId == id);
                if (c3 > 0) usages.Add(new UsageInfo { Screen = "Interest Slabs", Count = c3 });
                break;
            }

            case MasterType.RDProduct:
            {
                int c1 = await _context.accountmaster.CountAsync(x => x.BranchId == branchId && x.GeneralProductId == id && x.AccTypeId == (int)Enums.AccountTypes.RD);
                if (c1 > 0) usages.Add(new UsageInfo { Screen = "RD Account Master", Count = c1 });

                int c2 = await _context.rdproductbranchwiserule.CountAsync(x => x.BrId == branchId && x.RDProductId == id);
                if (c2 > 0) usages.Add(new UsageInfo { Screen = "Branch-wise Rules", Count = c2 });

                int c3 = await _context.rdinterestslab.CountAsync(x => x.BranchId == branchId && x.RDProductId == id);
                if (c3 > 0) usages.Add(new UsageInfo { Screen = "Interest Slabs", Count = c3 });
                break;
            }

            case MasterType.LoanProduct:
            {
                int c1 = await _context.accountmaster.CountAsync(x => x.BranchId == branchId && x.GeneralProductId == id && x.AccTypeId == (int)Enums.AccountTypes.Loan);
                if (c1 > 0) usages.Add(new UsageInfo { Screen = "Loan Account Master", Count = c1 });

                int c2 = await _context.loanproductbranchwiserule.CountAsync(x => x.BranchId == branchId && x.LoanProductId == id);
                if (c2 > 0) usages.Add(new UsageInfo { Screen = "Branch-wise Rules", Count = c2 });

                int c3 = await _context.loanslab.CountAsync(x => x.BrId == branchId && x.LoanProductId == id);
                if (c3 > 0) usages.Add(new UsageInfo { Screen = "Loan Slabs", Count = c3 });
                break;
            }
        }

        return usages;
    }
}
