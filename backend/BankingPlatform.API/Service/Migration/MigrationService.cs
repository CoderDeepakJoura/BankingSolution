using Microsoft.Data.SqlClient;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;

namespace BankingPlatform.API.Service.Migration;

public record TableComparisonDto(
    string SsTable,
    string PgTable,
    string DisplayName,
    string Category,
    long SsCount,
    long PgCount
)
{
    public string Status => PgCount == 0 && SsCount == 0 ? "synced"
                          : PgCount == 0 ? "missing"
                          : PgCount >= SsCount ? "synced" : "partial";
    public long Gap => SsCount - PgCount;
}

public record RunMigrationDto(List<string> Tables, string? TargetPgConnStr);

public class MigrationJob
{
    public string JobId { get; } = Guid.NewGuid().ToString("N")[..8];
    public string Status { get; set; } = "running";
    public List<string> Lines { get; } = new();
    public DateTime StartTime { get; } = DateTime.Now;
    public DateTime? EndTime { get; set; }
}

public class MigrationJobStore
{
    private readonly ConcurrentDictionary<string, MigrationJob> _jobs = new();
    public MigrationJob Create() { var j = new MigrationJob(); _jobs[j.JobId] = j; return j; }
    public MigrationJob? Get(string id) => _jobs.GetValueOrDefault(id);
}

public class MigrationService
{
    // Complete TABLE_RENAMES from migrate.py — (SsTable, PgTable, Category)
    private static readonly List<(string Ss, string Pg, string Cat)> AllTables = new()
    {
        // Reference / Location
        ("CSAS_T_State",                           "state",                           "Reference"),
        ("CSAS_T_Zone",                            "zone",                            "Reference"),
        ("CSAS_T_Thana",                           "thana",                           "Reference"),
        ("CSAS_T_PostOffice",                      "postoffice",                      "Reference"),
        ("CSAS_T_Tehsil",                          "tehsil",                          "Reference"),
        ("CSAS_T_Patwar",                          "patwar",                          "Reference"),
        ("CSAS_T_Village",                         "village",                         "Reference"),
        ("CSAS_T_Category",                        "category",                        "Reference"),
        ("CSAS_T_Caste",                           "caste",                           "Reference"),
        ("CSAS_T_Relation",                        "relation",                        "Reference"),
        ("CSAS_T_Occupation",                      "occupation",                      "Reference"),
        ("CSAS_T_District",                        "district",                        "Reference"),
        ("CSAS_T_Area",                            "area",                            "Reference"),
        ("CSAS_T_Station",                         "station",                         "Reference"),
        ("CSAS_T_StationBranch",                   "stationbranch",                   "Reference"),
        ("CSAS_T_Currency",                        "currency",                        "Reference"),
        ("CSAS_T_EduQualification",                "eduqualification",                "Reference"),
        ("CSAS_T_FormatBalSheetAsset",             "formatbalsheetasset",             "Reference"),
        ("CSAS_T_FormatBalSheetLiability",         "formatbalsheetliability",         "Reference"),
        ("CSAS_T_DayBookHeadWiseFormat",           "daybookheadwiseformat",           "Reference"),
        // Society / System
        ("CSAS_T_SocietyMaster",                   "societymaster",                   "System"),
        ("CSAS_T_SystemSetting",                   "systemsetting",                   "System"),
        ("CSAS_T_SuspenseAcc",                     "suspenseacc",                     "System"),
        ("CSAS_T_WorkingDayDetail",                "workingdaydetail",                "System"),
        ("CSAS_T_DayProcess",                      "dayprocess",                      "System"),
        ("CSAS_T_DayProcessDetail",                "dayprocessdetail",                "System"),
        ("CSAS_T_DepositSettings",                 "depositsettings",                 "System"),
        ("CSAS_T_SessionWiseVrSettings",           "sessionwisevrsettings",           "System"),
        ("CSAS_T_GeneralSettings",                 "generalsettings",                 "System"),
        ("CSAS_T_ErrorLog",                        "errorlog",                        "System"),
        // Security / Roles
        ("CSAS_T_UserRole",                        "userrole",                        "Security"),
        ("CSAS_T_RolesDefine",                     "rolesdefine",                     "Security"),
        ("CSAS_T_SecurityObject",                  "securityobject",                  "Security"),
        ("CSAS_T_SecurityPermission",              "securitypermission",              "Security"),
        ("CSAS_T_SecurityObjectPermission",        "securityobjectpermission",        "Security"),
        ("CSAS_T_SecObjPermissionRole",            "secobjpermissionrole",            "Security"),
        // Branch
        ("CSAS_T_BranchMaster",                    "branchmaster",                    "Branch"),
        ("CSAS_T_BranchSession",                   "branchsession",                   "Branch"),
        ("CSAS_T_User",                            "user",                            "Branch"),
        // Member
        ("CSAS_T_Member",                          "member",                          "Member"),
        ("CSAS_T_MemberNominee",                   "membernomineedetails",            "Member"),
        ("CSAS_T_MemberImages",                    "memberimages",                    "Member"),
        ("CSAS_T_MemberSequence",                  "membersequence",                  "Member"),
        ("CSAS_T_MemberSettings",                  "membersettings",                  "Member"),
        ("CSAS_T_DateWiseMemType",                 "datewisememtype",                 "Member"),
        // Accounts
        ("CSAS_T_AccountHeadType",                 "accountheadtype",                 "Accounts"),
        ("CSAS_T_AccountHead",                     "accounthead",                     "Accounts"),
        ("CSAS_T_AccountMaster",                   "accountmaster",                   "Accounts"),
        ("CSAS_T_AccOpeningBalance",               "accopeningbalance",               "Accounts"),
        ("CSAS_T_AccServiceDetail",                "accservicedetail",                "Accounts"),
        ("CSAS_T_AccNomineeDetail",                "accnomineedetail",                "Accounts"),
        ("CSAS_T_AccContactDetail",                "acccontactdetail",                "Accounts"),
        ("CSAS_T_AccountSavingDetail",             "accountsavingdetail",             "Accounts"),
        ("CSAS_T_AccountSequence",                 "accountsequence",                 "Accounts"),
        ("CSAS_T_PersonAccDetail",                 "personaccdetail",                 "Accounts"),
        ("CSAS_T_JointAccDetail",                  "jointaccountinfo",                "Accounts"),
        ("CSAS_T_JointAccSettings",                "jointaccsettings",                "Accounts"),
        ("CSAS_T_AccountKistDetail",               "accountkistdetail",               "Accounts"),
        ("CSAS_T_AccountKistSchedule",             "accountkistschedule",             "Accounts"),
        ("CSAS_T_AccountKistScheduleHistory",      "accountkistschedulehistory",      "Accounts"),
        ("CSAS_T_AccountLimitDetail",              "accountlimitdetail",              "Accounts"),
        ("CSAS_T_GenAccLimitDetail",               "genacclimitdetail",               "Accounts"),
        // Saving Product
        ("CSAS_T_SavingProduct",                   "savingproduct",                   "Saving"),
        ("CSAS_T_SavingProductInterestRules",      "savingproductinterestrules",      "Saving"),
        ("CSAS_T_SavingProductDefinition",         "savingproductdefinition",         "Saving"),
        ("CSAS_T_SavingProductInterestSlab",       "savingproductinterestslab",       "Saving"),
        ("CSAS_T_SavingProductInterestSlabDetail", "savingproductinterestslabdetail", "Saving"),
        ("CSAS_T_SavingProductPosting",            "savingproductposting",            "Saving"),
        ("CSAS_T_SavProdBranchWiseRule",           "savprodbranchwiserule",           "Saving"),
        ("CSAS_T_GeneralAccInterest",              "generalaccinterest",              "Saving"),
        ("CSAS_T_GeneralIntSlab",                  "generalintslab",                  "Saving"),
        // FD
        ("CSAS_T_FDProduct",                       "fdproduct",                       "FD"),
        ("CSAS_T_FDProductBranchWiseRule",         "fdproductbranchwiserule",         "FD"),
        ("CSAS_T_FDProductInterestRules",          "fdproductinterestrules",          "FD"),
        ("CSAS_T_FDProductDefinition",             "fdproductdefinition",             "FD"),
        ("CSAS_T_FDProductPosting",                "fdproductposting",                "FD"),
        ("CSAS_T_FDProductSlab",                   "fdproductslab",                   "FD"),
        ("CSAS_T_FDProductSlabInt",                "fdproductslabint",                "FD"),
        ("CSAS_T_FDProductSlabIntDetail",          "fdproductslabintdetail",          "FD"),
        ("CSAS_T_FDTDSSlab",                       "fdtdsslab",                       "FD"),
        ("CSAS_T_FDTDSSlabDetail",                 "fdtdsslabdetail",                 "FD"),
        ("CSAS_T_FDAccountDetail",                 "fdaccountdetail",                 "FD"),
        // Bank FD
        ("CSAS_T_BankFDAccountDetail",             "bankfdaccountdetail",             "BankFD"),
        ("CSAS_T_BankFDAccountOpeningBalance",     "bankfdaccountopeningbalance",     "BankFD"),
        ("CSAS_T_BankFDAccountOpeningTDS",         "bankfdaccountopeningtds",         "BankFD"),
        ("CSAS_T_BFDHeadTDSAccSettings",           "bfdheadtdsaccsettings",           "BankFD"),
        // RD
        ("CSAS_T_RDProduct",                       "rdproduct",                       "RD"),
        ("CSAS_T_RDProductBranchWiseRule",         "rdproductbranchwiserule",         "RD"),
        ("CSAS_T_RDProductDefinition",             "rdproductdefinition",             "RD"),
        ("CSAS_T_RDProductInterestRules",          "rdproductinterestrules",          "RD"),
        ("CSAS_T_RDProductPosting",                "rdproductposting",                "RD"),
        ("CSAS_T_RDAccountDetail",                 "rdaccountdetail",                 "RD"),
        ("CSAS_T_RDAccountOpeningBalance",         "rdaccountopeningbalance",         "RD"),
        ("CSAS_T_RDSlab",                          "rdslab",                          "RD"),
        ("CSAS_T_RDSlabDetail",                    "rdslabdetail",                    "RD"),
        // Loan
        ("CSAS_T_LoanProduct",                     "loanproduct",                     "Loan"),
        ("CSAS_T_LoanProductBranchWiseRule",       "loanproductbranchwiserule",       "Loan"),
        ("CSAS_T_LoanProductDefinition",           "loanproductdefinition",           "Loan"),
        ("CSAS_T_LoanProductAdvancement",          "loanproductadvancement",          "Loan"),
        ("CSAS_T_LoanProductMarginMoneyRule",      "loanproductmarginmoneyrule",      "Loan"),
        ("CSAS_T_LoanProductPosting",              "loanproductposting",              "Loan"),
        ("CSAS_T_LoanProductRecovery",             "loanproductrecovery",             "Loan"),
        ("CSAS_T_LoanProductSecurity",             "loanproductsecurity",             "Loan"),
        ("CSAS_T_LoanProductShareMoneyRule",       "loanproductsharemoneyrule",       "Loan"),
        ("CSAS_T_LoanSlab",                        "loanslab",                        "Loan"),
        ("CSAS_T_LoanSlabDetail",                  "loanslabdetail",                  "Loan"),
        ("CSAS_T_LoanCategory",                    "loancategory",                    "Loan"),
        ("CSAS_T_LoanExpStand",                    "loanexpstand",                    "Loan"),
        ("CSAS_T_LoanAccOpeningBalance",           "loanaccopeningbalance",           "Loan"),
        ("CSAS_T_LoanAccountBalanceDetail",        "loanaccountbalancedetail",        "Loan"),
        ("CSAS_T_LoanAccountRecoveryInterest",     "loanaccountrecoveryinterest",     "Loan"),
        ("CSAS_T_LoanAccFDPledge",                 "loanaccfdpledge",                 "Loan"),
        ("CSAS_T_LoanAccFDPledgeDetail",           "loanaccfdpledgedetail",           "Loan"),
        ("CSAS_T_LoanAccRDPledge",                 "loanaccrdpledge",                 "Loan"),
        ("CSAS_T_LoanAccRDPledgeDetail",           "loanaccrdpledgedetail",           "Loan"),
        ("CSAS_T_LoanGuarWitness",                 "loanguarwitness",                 "Loan"),
        ("CSAS_T_ExpenseCatagory",                 "expensecategory",                 "Loan"),
        // Kist / Schedules
        ("CSAS_T_KistReschedule",                  "kistreschedule",                  "Kist"),
        ("CSAS_T_KistRescheduleAccs",              "kistrescheduleaccs",              "Kist"),
        ("CSAS_T_DivCalculation",                  "divcalculation",                  "Kist"),
        // NPA
        ("CSAS_T_NPAPlanCategory",                 "npaplancategory",                 "NPA"),
        ("CSAS_T_NPAPlanMaster",                   "npaplanmaster",                   "NPA"),
        // Agent / Collection
        ("CSAS_T_AgentLevelMaster",                "agentlevelmaster",                "Agent"),
        ("CSAS_T_AgentLevelDetail",                "agentleveldetail",                "Agent"),
        ("CSAS_T_AgentMaster",                     "agentmaster",                     "Agent"),
        ("CSAS_T_AccountAgentDatewise",            "accountagentdatewise",            "Agent"),
        ("CSAS_T_CollReceipt",                     "collreceipt",                     "Agent"),
        ("CSAS_T_CollSavingReceiptDetail",         "collsavingreceiptdetail",         "Agent"),
        ("CSAS_T_CollRDReceiptDetail",             "collrdreceiptdetail",             "Agent"),
        ("CSAS_T_CollLoanReceiptDetail",           "collloanreceiptdetail",           "Agent"),
        // Voucher
        ("CSAS_T_VoucherSettings",                 "vouchersettings",                 "Voucher"),
        ("CSAS_T_Voucher",                         "voucher",                         "Voucher"),
        ("CSAS_T_VoucherAccCRDr",                  "vouchercreditdebitdetails",       "Voucher"),
        ("CSAS_T_VoucherSavingDetail",             "vouchersavingdetail",             "Voucher"),
        ("CSAS_T_VoucherFDDetail",                 "voucherfddetail",                 "Voucher"),
        ("CSAS_T_VoucherBFDDetail",                "voucherbfddetail",                "Voucher"),
        ("CSAS_T_VoucherRDDetail",                 "voucherrddetail",                 "Voucher"),
        ("CSAS_T_VoucherExpDetail",                "loanexpense",                     "Voucher"),
        ("CSAS_T_VoucherRecIntDetail",             "voucherrecintdetail",             "Voucher"),
        ("CSAS_T_VoucherAgent",                    "voucheragent",                    "Voucher"),
        ("CSAS_T_VoucherLinking",                  "voucherlinking",                  "Voucher"),
        ("CSAS_T_VoucherLoanAccOverdue",           "voucherloanaccoverdue",           "Voucher"),
        ("CSAS_T_VoucherJointAccDetail",           "voucherjointaccdetail",           "Voucher"),
        ("CSAS_T_VoucherCurrencyDetail",           "vouchercurrencydetail",           "Voucher"),
        ("CSAS_T_VrODReserve",                     "vrodreserve",                     "Voucher"),
        ("CSAS_T_OtherBrAccs",                     "otherbranchaccounts",             "Voucher"),
        // GST / Tax
        ("CSAS_T_Tax",                             "tax",                             "GST"),
        ("CSAS_T_TaxType",                         "taxtype",                         "GST"),
        ("CSAS_T_TaxGroup",                        "taxgroup",                        "GST"),
        ("CSAS_T_TaxGroupType",                    "taxgrouptype",                    "GST"),
        ("CSAS_T_BillBook",                        "billbook",                        "GST"),
        ("CSAS_T_StockMain",                       "stockmain",                       "GST"),
        ("CSAS_T_StockBillBookDetail",             "stockbillbookdetail",             "GST"),
        ("CSAS_T_NextBillNumber",                  "nextbillnumber",                  "GST"),
        // Services
        ("CSAS_T_ServiceTaxRule",                  "servicetaxrule",                  "Services"),
        ("CSAS_T_ServiceTaxTypeDet",               "servicetaxtypedet",               "Services"),
        ("CSAS_T_SMDetail",                        "smdetail",                        "Services"),
        // HR
        ("CSAS_T_Employeedesignation",             "employeedesignation",             "HR"),
        ("CSAS_T_EmployeeMaster",                  "employeemaster",                  "HR"),
        ("CSAS_T_EmployeeAttendance",              "employeeattendance",              "HR"),
        ("CSAS_T_SalaryComponent",                 "salarycomponent",                 "HR"),
        ("CSAS_T_SalaryCompEmpWise",               "salarycompempwise",               "HR"),
        ("CSAS_T_MonthlySalary",                   "monthlysalary",                   "HR"),
        ("CSAS_T_EmpGrade",                        "empgrade",                        "HR"),
        ("CSAS_T_SalarySlab",                      "salaryslab",                      "HR"),
    };

    private readonly IConfiguration _cfg;
    private readonly MigrationJobStore _jobs;

    public MigrationService(IConfiguration cfg, MigrationJobStore jobs)
    {
        _cfg = cfg;
        _jobs = jobs;
    }

    public async Task<List<TableComparisonDto>> GetComparisonAsync()
    {
        var legacy = _cfg["Migration:LegacyConnectionString"]
            ?? throw new InvalidOperationException("Migration:LegacyConnectionString not configured.");
        var pgConn = _cfg.GetConnectionString("BankingDatabase")
            ?? throw new InvalidOperationException("ConnectionStrings:BankingDatabase not configured.");

        var result = new List<TableComparisonDto>();

        using var ss = new SqlConnection(legacy);
        await ss.OpenAsync();

        await using var pg = new Npgsql.NpgsqlConnection(pgConn);
        await pg.OpenAsync();

        foreach (var (ssTable, pgTable, category) in AllTables)
        {
            long ssCount = 0, pgCount = 0;

            try
            {
                using var cmd = new SqlCommand($"SELECT COUNT_BIG(*) FROM [{ssTable}]", ss);
                ssCount = (long)(await cmd.ExecuteScalarAsync() ?? 0L);
            }
            catch { }

            try
            {
                await using var cmd = new Npgsql.NpgsqlCommand($"SELECT COUNT(*) FROM \"{pgTable}\"", pg);
                pgCount = Convert.ToInt64(await cmd.ExecuteScalarAsync() ?? 0L);
            }
            catch { }

            result.Add(new TableComparisonDto(ssTable, pgTable, MakeDisplayName(ssTable), category, ssCount, pgCount));
        }

        return result;
    }

    public MigrationJob StartMigration(List<string> tables, string? targetPgConnStr = null)
    {
        var job = _jobs.Create();
        _ = Task.Run(() => RunAsync(job, tables, targetPgConnStr));
        return job;
    }

    private async Task RunAsync(MigrationJob job, List<string> tables, string? targetPgConnStr = null)
    {
        var scriptPath = _cfg["Migration:ScriptPath"]
            ?? throw new InvalidOperationException("Migration:ScriptPath not configured.");
        var pythonPath = _cfg["Migration:PythonPath"] ?? "python";
        var legacy = _cfg["Migration:LegacyConnectionString"]
            ?? throw new InvalidOperationException("Migration:LegacyConnectionString not configured.");

        // Use user-supplied PostgreSQL connection string if provided, else fall back to appsettings
        string pgArg;
        if (!string.IsNullOrWhiteSpace(targetPgConnStr))
        {
            // Already in psycopg2 format if it uses spaces (host= dbname= ...), otherwise convert
            pgArg = targetPgConnStr.Contains(';') ? ConvertToPsycopg2(targetPgConnStr) : targetPgConnStr;
        }
        else
        {
            var pg = _cfg.GetConnectionString("BankingDatabase")
                ?? throw new InvalidOperationException("ConnectionStrings:BankingDatabase not configured.");
            pgArg = ConvertToPsycopg2(pg);
        }

        var tablesArg = string.Join(",", tables);

        job.Lines.Add($"[{DateTime.Now:HH:mm:ss}] Target PostgreSQL: {MaskPassword(pgArg)}");

        var psi = new ProcessStartInfo
        {
            FileName = pythonPath,
            Arguments = $"\"{scriptPath}\" --source \"{legacy}\" --target \"{pgArg}\" --tables {tablesArg}",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        job.Lines.Add($"[{DateTime.Now:HH:mm:ss}] Starting migration for {tables.Count} table(s): {tablesArg}");
        job.Lines.Add($"[{DateTime.Now:HH:mm:ss}] Script: {scriptPath}");

        try
        {
            using var proc = Process.Start(psi)!;
            var stdoutTask = ReadOutputAsync(proc.StandardOutput, job);
            var stderrTask = ReadOutputAsync(proc.StandardError, job);
            await Task.WhenAll(stdoutTask, stderrTask);
            await proc.WaitForExitAsync();
            job.Lines.Add($"[{DateTime.Now:HH:mm:ss}] Process exited with code {proc.ExitCode}");
            job.Status = proc.ExitCode == 0 ? "completed" : "failed";
        }
        catch (Exception ex)
        {
            job.Lines.Add($"[{DateTime.Now:HH:mm:ss}] ERROR: {ex.Message}");
            job.Status = "failed";
        }

        job.EndTime = DateTime.Now;
    }

    private static async Task ReadOutputAsync(StreamReader reader, MigrationJob job)
    {
        string? line;
        while ((line = await reader.ReadLineAsync()) != null)
            job.Lines.Add(line);
    }

    private static string MakeDisplayName(string ssTable)
    {
        var name = ssTable.Replace("CSAS_T_", "");
        // Insert space before each uppercase letter that follows a lowercase or digit
        return Regex.Replace(name, @"(?<=[a-z0-9])([A-Z])", " $1");
    }

    private static string MaskPassword(string connStr) =>
        Regex.Replace(connStr, @"(password=)\S+", "$1***", RegexOptions.IgnoreCase);

    private static string ConvertToPsycopg2(string npgsql)
    {
        var sb = new StringBuilder();
        foreach (var part in npgsql.Split(';', StringSplitOptions.RemoveEmptyEntries))
        {
            var idx = part.IndexOf('=');
            if (idx < 0) continue;
            var key = part[..idx].Trim().ToLowerInvariant();
            var val = part[(idx + 1)..].Trim();
            var mapped = key switch
            {
                "host" or "server" => "host",
                "database" => "dbname",
                "username" or "user id" or "userid" => "user",
                "password" => "password",
                "port" => "port",
                _ => null
            };
            if (mapped != null)
                sb.Append($"{mapped}={val} ");
        }
        return sb.ToString().Trim();
    }
}
