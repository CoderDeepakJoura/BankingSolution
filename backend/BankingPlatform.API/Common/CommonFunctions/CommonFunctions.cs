
using BankingPlatform.API.DTO.BranchWiseRule;
using BankingPlatform.API.DTO.Settings;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Miscalleneous;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion.Internal;
using System;
using System.Security.Claims;

namespace BankingPlatform.API.Common.CommonFunctions
{
    public class CommonFunctions
    {
        public const long shareMoneyCapitalHeadCode = 101103101000;
        public const long dividendPayableHeadCode = 140101000000;
        private readonly BankingDbContext _appcontext;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public CommonFunctions(
            BankingDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _appcontext = context ?? throw new ArgumentNullException(nameof(context));
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<branchMaster?> GetBranchInfoFromBranchCodeAsync(string branchCode)
        {
            if (string.IsNullOrEmpty(branchCode) || string.IsNullOrWhiteSpace(branchCode))
                return null;

            return await _appcontext.branchmaster
        .FirstOrDefaultAsync(x => x.branchmaster_code == branchCode);
        }
        public async Task<branchMaster?> GetBranchInfoFromBranchIdAsync(int branchId)
        {
            if (branchId <= 0)
                return null;

            return await _appcontext.branchmaster
        .FirstOrDefaultAsync(x => x.id == branchId);
        }

        public static int GetLastValue(string input)
        {
            // Check if the input string is null or empty to prevent errors.
            if (string.IsNullOrEmpty(input))
            {
                return 0; 
            }
            string[] parts = input.Split('-');
            return parts.Length > 0 ? Int32.Parse(parts[parts.Length - 1]) : 0 ;
        }

        public string GetHeadCodeFromId(int? id, int branchId)
        {
            string result = "";
            if (id != null && branchId > 0)
            {
                var data = _appcontext.accounthead.FirstOrDefault(x => x.branchid == branchId && x.id == id);
                if (data != null)
                    result = data.headcode + "-" + data.name;
            }
            return result;
        }

        public async Task<string> GetZoneNameFromId(int zoneId, int branchId) =>await _appcontext.zone
                                     .Where(x => x.branchid == branchId && x.id == zoneId)
                                     .Select(x => x.zonename)
                                     .FirstOrDefaultAsync() ?? "";
        public async Task<string> GetThanaNameFromId(int zoneId, int branchId) => await _appcontext.thana
                                     .Where(x => x.branchid == branchId && x.id == zoneId)
                                     .Select(x => x.thananame)
                                     .FirstOrDefaultAsync() ?? ""; 
        public async Task<string> GetPostOfficeNameFromId(int zoneId, int branchId) => await _appcontext.postoffice
                                     .Where(x => x.branchid == branchId && x.id == zoneId)
                                     .Select(x => x.postofficename)
                                     .FirstOrDefaultAsync() ?? "";
        public async Task<string> GetTehsilFromId(int zoneId, int branchId) => await _appcontext.tehsil
                                     .Where(x => x.branchid == branchId && x.id == zoneId)
                                     .Select(x => x.tehsilname)
                                     .FirstOrDefaultAsync() ?? "";

        public async Task<string> GetPatwarFromId(int patwarId, int branchId) => await _appcontext.patwar
                                     .Where(x => x.branchid == branchId && x.id == patwarId)
                                     .Select(x => x.description)
                                     .FirstOrDefaultAsync() ?? "";

        public string GetStateFromId(int stateId) => _appcontext.state
                                    .Where(x => x.id == stateId)
                                    .Select(x => x.statename)
                                    .FirstOrDefault() ?? "";

        public string GetCategoryNameFromId(int categoryId, int branchId) => _appcontext.category
                                    .Where(x => x.id == categoryId
                                    && x.branchid == branchId)
                                    .Select(x => x.categoryname)
                                    .FirstOrDefault() ?? "";

        public string GetAccountHeadTypeNameFromId(int headTypeId, int branchId) => _appcontext.accountheadtype
                                    .Where(x => x.id == headTypeId
                                    && x.branchid == branchId)
                                    .Select(x => x.description)
                                    .FirstOrDefault() ?? "";

        public async Task LogErrors(Exception ex, string functionName, string screenName)
        {
            var user = _httpContextAccessor.HttpContext!.User!;
            int branchId = Int32.Parse(user.FindFirst("branchId")?.Value!);
            int userId = Int32.Parse(user.FindFirst("userId")?.Value!);
            var ErrorlogInfo = new ErrorLog
            {
                BranchId = branchId,
                ErrorDateTime = DateTimeOffset.UtcNow,
                ErrorMessage = ex.Message,
                StackTrace = ex.StackTrace ?? "",
                InnerException = ex.InnerException?.Message,
                FunctionName = functionName,
                ScreenName = screenName,
                UserId = 1
            };
            _appcontext.ChangeTracker.Clear();
            _appcontext.errorlog.Add(ErrorlogInfo);
            await _appcontext.SaveChangesAsync();
        }

        public async Task<bool> CheckIfAccountHeadTypeInUse(int headTypeId, int branchId) => await _appcontext.accounthead
            .Where(x => x.branchid == branchId && x.accountheadtypeid == headTypeId).AnyAsync();
        public async Task<bool> CheckIfStateInUse(int stateId, int branchId) => await _appcontext.accgstinfo
            .Where(x => x.BranchId == branchId && x.StateId == stateId).AnyAsync();
        public async Task<bool> CheckIfLocationDataInUse(int branchId, int zoneId = 0 , int thanaId = 0, int postOfficeId = 0, int tehsilId = 0 ) => await _appcontext.village
            .Where(x => x.branchid == branchId && ((x.zoneid > 0 && x.zoneid == zoneId) || (x.thanaid > 0 && x.thanaid == thanaId) || (x.postofficeid > 0 && x.postofficeid == postOfficeId) || (x.tehsilid > 0 && x.tehsilid == tehsilId))).AnyAsync();

        public async Task<int> GetLatestVoucherNo(int branchId, DateTime? voucherDate = null)
        {
            int voucherNoSetting = await _appcontext.vouchersettings
                .Where(x => x.branchid == branchId)
                .Select(x => x.voucherNumberSetting)
                .FirstOrDefaultAsync(); // 1 = Day Wise, 2 = Financial Year Wise, 0 = not configured

            int? maxVoucherNo;

            if (voucherNoSetting == 1) // Day Wise — reset each working day
            {
                DateTime referenceDate;
                if (voucherDate.HasValue)
                {
                    referenceDate = voucherDate.Value.Date;
                }
                else
                {
                    DateTime workingDate = await _appcontext.daybeginendinfo
                        .Where(x => x.branchid == branchId)
                        .OrderByDescending(x => x.workingdate)
                        .Select(x => x.workingdate)
                        .FirstOrDefaultAsync();
                    referenceDate = workingDate.Date;
                }

                maxVoucherNo = await _appcontext.voucher
                    .Where(x => x.BrID == branchId
                             && x.VoucherDate >= referenceDate
                             && x.VoucherDate < referenceDate.AddDays(1))
                    .MaxAsync(x => (int?)x.VoucherNo);
            }
            else if (voucherNoSetting == 2) // Financial Year / Session Wise — reset each session
            {
                // Use the session that contains the voucher date; fall back to current session
                var session = voucherDate.HasValue
                    ? await _appcontext.branchsession
                        .Where(x => x.branchid == branchId
                                 && x.fromdate <= voucherDate.Value.Date
                                 && x.todate >= voucherDate.Value.Date)
                        .FirstOrDefaultAsync()
                    : await _appcontext.branchsession
                        .Where(x => x.branchid == branchId && x.iscurrent)
                        .FirstOrDefaultAsync();

                if (session != null)
                {
                    DateTime sessionStart = session.fromdate.Date;
                    DateTime sessionEnd = session.todate.Date.AddDays(1); // exclusive upper bound

                    maxVoucherNo = await _appcontext.voucher
                        .Where(x => x.BrID == branchId
                                 && x.VoucherDate >= sessionStart
                                 && x.VoucherDate < sessionEnd)
                        .MaxAsync(x => (int?)x.VoucherNo);
                }
                else
                {
                    // No matching session found — fall back to global max for this branch
                    maxVoucherNo = await _appcontext.voucher
                        .Where(x => x.BrID == branchId)
                        .MaxAsync(x => (int?)x.VoucherNo);
                }
            }
            else
            {
                // Setting not configured — global max for the branch (original behaviour)
                maxVoucherNo = await _appcontext.voucher
                    .Where(x => x.BrID == branchId)
                    .MaxAsync(x => (int?)x.VoucherNo);
            }

            return (maxVoucherNo ?? 0) + 1;
        }

        public async Task<int> GetHeadIdFromHeadCode(int branchId, long headCode) => await _appcontext.accounthead.Where(x => x.branchid == branchId && x.headcode == headCode).Select(x => x.id > 0 ? x.id : 0).FirstOrDefaultAsync();

        public async Task<bool> IsAutoVerification(int branchId) => await _appcontext.vouchersettings.Where(x => x.branchid == branchId).Select(x => x.autoVerification).FirstOrDefaultAsync();

        public async Task<SettingsDTO> GetAllSettings(int branchId)
        {
            try
            {
                var existingGeneralSettings = await _appcontext.generalsettings
                    .FirstOrDefaultAsync(s => s.branchid == branchId);

                var existingAccountSettings = await _appcontext.accountsettings
                    .FirstOrDefaultAsync(s => s.branchid == branchId);

                var existingVoucherSettings = await _appcontext.vouchersettings
                    .FirstOrDefaultAsync(s => s.branchid == branchId);

                var existingTDSSettings = await _appcontext.tdssettings
                    .FirstOrDefaultAsync(s => s.branchid == branchId);

                var existingPrintingSettings = await _appcontext.printingsettings
                    .FirstOrDefaultAsync(s => s.branchid == branchId);

                SettingsDTO settingsDTO = new SettingsDTO
                {
                    GeneralSettings = existingGeneralSettings != null
                        ? new GeneralSettingsDTO
                        {
                            BranchId = branchId,
                            AdmissionFeeAccountId = existingGeneralSettings.admissionFeeAccountId,
                            AdmissionFeeAmount = existingGeneralSettings.admissionFeeAmount,
                            DefaultCashAccountId = existingGeneralSettings.defaultCashAccountId,
                            MinimumMemberAge = existingGeneralSettings.minimumMemberAge,
                            ShareMoneyPercentageForLoan = existingGeneralSettings.shareMoneyPercentageForLoan,
                            BankFDMaturityReminder = existingGeneralSettings.bankFDMaturityReminder,
                            BankFDMaturityReminderDays = existingGeneralSettings.bankFDMaturityReminderDays
                        }
                        : new GeneralSettingsDTO { BranchId = branchId },

                    AccountSettings = existingAccountSettings != null
                        ? new AccountSettingsDTO
                        {
                            BranchId = branchId,
                            AccountVerification = existingAccountSettings.accountVerification,
                            MemberKYC = existingAccountSettings.memberKYC,
                            SavingAccountLength = existingAccountSettings.savingAccountLength,
                            LoanAccountLength = existingAccountSettings.loanAccountLength,
                            FDAccountLength = existingAccountSettings.fdAccountLength,
                            RDAccountLength = existingAccountSettings.rdAccountLength,
                            ShareAccountLength = existingAccountSettings.shareAccountLength
                        }
                        : new AccountSettingsDTO { BranchId = branchId },

                    VoucherSettings = existingVoucherSettings != null
                        ? new VoucherSettingsDTO
                        {
                            BranchId = branchId,
                            VoucherPrinting = existingVoucherSettings.voucherPrinting,
                            SingleVoucherEntry = existingVoucherSettings.singleVoucherEntry,
                            VoucherNumberSetting = existingVoucherSettings.voucherNumberSetting,
                            AutoVerification = existingVoucherSettings.autoVerification,
                            ReceiptNoSetting = existingVoucherSettings.receiptNoSetting
                        }
                        : new VoucherSettingsDTO { BranchId = branchId },

                    TDSSettings = existingTDSSettings != null
                        ? new TDSSettingsDTO
                        {
                            BranchId = branchId,
                            BankFDTDSApplicability = existingTDSSettings.bankFDTDSApplicability,
                            BankFDTDSRate = existingTDSSettings.bankFDTDSRate,
                            BankFDTDSDeductionFrequency = existingTDSSettings.bankFDTDSDeductionFrequency,
                            BankFDTDSLedgerAccountId = existingTDSSettings.bankFDTDSLedgerAccountId
                        }
                        : new TDSSettingsDTO { BranchId = branchId },

                    PrintingSettings = existingPrintingSettings != null
                        ? new PrintingSettingsDTO
                        {
                            BranchId = branchId,
                            FDReceiptSetting = existingPrintingSettings.fdReceiptSetting,
                            RDCertificateSetting = existingPrintingSettings.rdCertificateSetting
                        }
                        : new PrintingSettingsDTO { BranchId = branchId }
                };

                return settingsDTO;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public async Task<string> GetAccountNameFromAccId(int accId, int branchId, bool withAccId = false)
        {
            string accountName = "";
            if(accId > 0 && branchId > 0)
            {
                accountName = await _appcontext.accountmaster.Where(x => x.BranchId == branchId && x.ID == accId).Select(x => x.AccountName != "" ? x.AccountName : "").FirstOrDefaultAsync() ?? "";
                if (withAccId && !string.IsNullOrEmpty(accountName))
                    accountName = $"{accountName}-{accId}";
            }
            return accountName;
        }

        public async Task<long> GetAccountHeadCodeFromAccId(int accId, int branchId)
        {
            long headCode = 0;
            if (accId > 0 && branchId > 0)
            {
                headCode = await _appcontext.accountmaster.Where(x => x.BranchId == branchId && x.ID == accId).Select(x => x.HeadCode).FirstOrDefaultAsync();
            }
            return headCode;
        }

        public async Task<int> GetVoucherIdFromVTypeAndSubType(int vrSubType, int vrType, int SMAccID, int branchId) => await (from p in _appcontext.vouchercreditdebitdetails.AsNoTracking()
                   join q in _appcontext.voucher.AsNoTracking()   
                   on new { vrId = p.VoucherID, brId = p.BrId }
                   equals new { vrId = q.Id, brId = q.BrID }
                   where q.VoucherSubType == vrSubType
                   && q.VoucherType == vrType
                   && p.AccountId == SMAccID
                   && p.BrId == branchId
                   select q.Id > 0 ? q.Id : 0)
                   .FirstOrDefaultAsync();

        public async Task<List<VoucherCreditDebitDetails>> GetVoucherInfoFromVoucherId(int voucherId, int branchId) => await _appcontext.vouchercreditdebitdetails.Where(x => x.BrId == branchId && x.VoucherID == voucherId).ToListAsync();

        public string getHeadTypeCategoryNameFromId(int id)
        {
            string name = "";
            switch (id) {
                case 1:
                    name = "Assets";
                    break;
                case 2:
                    name = "Liabilities";
                    break;
                case 3:
                    name = "Indirect Income";
                    break;
                case 4:
                    name = "Indirect Expense";
                    break;
                case 5:
                    name = "Direct Income";
                    break;
                case 6:
                    name = "Direct Expense";
                    break;
                case 7:
                    name = "Sale Return";
                    break;
                case 8:
                    name = "Purchase Return";
                    break;
                case 9:
                    name = "Sale";
                    break;
                case 10:
                    name = "Purchase";
                    break;
            }

            return name;
        }

        public async Task<SavingDTO> GetSavingProductBranchWiseRuleInfo (int branchId, int productId)
        {
            var existingrule = await _appcontext.savingproductbranchwiserule
                .FirstOrDefaultAsync(s => s.BranchId == branchId && s.SavingProductId == productId);
            return new SavingDTO()
            {
                depwithdrawlimit = existingrule?.depwithdrawlimit ?? 0,
                BranchId = branchId,
                depwithdrawlimitinterval = existingrule?.depwithdrawlimitinterval,
                intexpaccount = existingrule != null ? existingrule.intexpaccount : 0,
                SavingProductId = existingrule != null ? existingrule.SavingProductId : 0,
                Id = existingrule != null ? existingrule.Id : 0,
                DaysInAYear = existingrule?.DaysInAYear ?? 365,
            };
        }

        public async Task<FDDTO> GetFDProductBranchWiseRuleInfo(int branchId, int productId)
        {
            var existingrule = await _appcontext.fdproductbranchwiserule
                .FirstOrDefaultAsync(s => s.BranchId == branchId && s.FDProductId == productId);
            return new FDDTO()
            {
                FDProductId = existingrule != null ? existingrule.FDProductId : 0,
                BranchId = branchId,
                DaysInAYear = existingrule?.DaysInAYear ?? 0,
                AccNoGeneration = existingrule?.AccNoGeneration ?? 0,
                ClosingChargesAccount = existingrule?.ClosingChargesAccount ?? 0,
                InterestCalculationMethod = existingrule?.InterestCalculationMethod ?? 0,
                IntExpenseAccount = existingrule?.IntExpenseAccount ?? 0,
                IntPayableAccount = existingrule?.IntPayableAccount ?? 0

            };
        }
        public string GetSavingProductNameFromId(int branchId, int productId) => _appcontext.savingproduct.Where(x => x.BranchId == branchId && x.Id == productId).Select(x => x.ProductName).FirstOrDefault() ?? "";

        public async Task<(int headId, long headCode)> GetSavingProductPrincipalHead(int branchId, int productId)
        {
           var data = await _appcontext.savingproductpostingheads.AsNoTracking().Where(x => x.BranchId == branchId && x.SavingsProductId == productId).FirstOrDefaultAsync();
            int headID = 0; long headCode = 0;
            if (data != null) {
                headID = data.PrincipalBalHeadCode;
                headCode = Convert.ToInt64(GetHeadCodeFromId(headID, branchId).Split('-')[0]);
            }
            return (headID, headCode);

        }

        public async Task<string> GetMemberShipNoFromMemberIDandBranchID(int memberId, int memberBranchID, int memberType)
     => await _appcontext.member
         .AsNoTracking()
         .Where(x => x.Id == memberId && x.BranchId == memberBranchID && x.MemberType == memberType)
         .Select(x => memberType == 1
             ? x.NominalMembershipNo.ToString()
             : x.PermanentMembershipNo.ToString())
         .FirstOrDefaultAsync() ?? "";

        public async Task<string> GetShareMoneyAccNoFromMemberIDandBranchID(int memberId, int memberBranchID, int accTypeId)
     => await _appcontext.accountmaster
         .AsNoTracking()
         .Where(x => x.MemberId == memberId && x.MemberBranchID == memberBranchID && x.AccTypeId == accTypeId)
         .Select(x => x.AccountNumber)
         .FirstOrDefaultAsync() ?? "";

        public async Task<bool> IsAnyBranchStatedAsMain(int branchId = 0) => await _appcontext.branchmaster.AsNoTracking().Where(x => x.id != branchId && x.branchmaster_ismainbranch == 1).AnyAsync();

        public int GetCurrentSessionId()
        {
            var raw = _httpContextAccessor.HttpContext?.User?.FindFirst("sessionId")?.Value;
            return int.TryParse(raw, out var id) ? id : 0;
        }

        public string GetCurrentUserId()
        {
            var user = _httpContextAccessor.HttpContext!.User!;
            return user?.FindFirst("userId")?.Value
                                   ?? user?.FindFirst("UserId")?.Value
                                   ?? user?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                                   ?? "";
        }

        public async Task<int> GetSavingInterestExpenseAccount(int productId, int branchId)
        {
            int interestAccId = 0;
            if(productId > 0 && branchId > 0)
            {
                interestAccId = await _appcontext.savingproductbranchwiserule.Where(x => x.BranchId == branchId && x.SavingProductId == productId).Select(x => x.intexpaccount).FirstOrDefaultAsync();
            }
            return interestAccId;
        }

        public string GetFDProductNameFromID(int productId, int branchId) => _appcontext.fdproduct.Where(x => x.BranchId == branchId && x.Id == productId).Select(x => x.ProductName).FirstOrDefault() ?? "";

        public async Task<int> GetHeadIdFromHeadCode(long headCode, int branchId)
        {
            int headId = 0;
            if (headCode > 0 && branchId > 0)
            {
                headId = await _appcontext.accounthead.Where(x => x.branchid == branchId && x.headcode == headCode).Select(x => x.id > 0 ? x.id : 0).FirstOrDefaultAsync();
            }
            return headId;
        }

        public async Task<(int headId, long headCode)> GetFDProductPrincipalHead(int branchId, int productId)
        {
            var data = await _appcontext.fdproductpostingheads.AsNoTracking().Where(x => x.BranchId == branchId && x.ProductId == productId).FirstOrDefaultAsync();
            int headID = 0; long headCode = 0;
            if (data != null)
            {
                headID = await GetHeadIdFromHeadCode(data.PrincipalBalHeadCode, branchId);
                headCode = data.PrincipalBalHeadCode;
            }
            return (headID, headCode);

        }

        public async Task<bool> IsFirstSession(int sessionFromYear, int sessionToYear) => await _appcontext.branchsession.Where(x => x.sessionfrom == sessionFromYear && x.sessionto == sessionToYear).Select(x => x.isfirst).FirstOrDefaultAsync();

        public async Task<(DateTime firstSessionFromDate, DateTime firstSessionToDate)> FirstSessionFromDateAndToDate(int branchId)
        {
            (DateTime firstSessionFromDate, DateTime firstSessionToDate) = (DateTime.MinValue, DateTime.MinValue);
            var sessionInfo = await _appcontext.branchsession.AsNoTracking().Where(x => x.branchid == branchId && x.isfirst == true).FirstOrDefaultAsync();
            if (sessionInfo != null)
                (firstSessionFromDate, firstSessionToDate) = (sessionInfo.fromdate, sessionInfo.todate);
            return (firstSessionFromDate, firstSessionToDate);
        }

        public async Task<string> GetAccountTypeFromProductIdAndBranchId(int productId, int branchId)
        {
            string accountType = "Same Account";
            if(productId > 0 && branchId > 0)
            {
                int accType = await _appcontext.fdproductrules.Where(x => x.BranchId == branchId && x.ProductId == productId).Select(x => x.IntAccountType).FirstOrDefaultAsync();
                accountType = accType == (int)Enums.AccountTypeOfFDProduct.SameAccount ? accountType : "Other Account";
            }
            return accountType;
        }

        public (int Years, int Months) CalculateAgeYM(DateTime dob)
        {
            var today = DateTime.Today;

            int years = today.Year - dob.Year;
            int months = today.Month - dob.Month;

            if (today.Day < dob.Day)
                months--;

            if (months < 0)
            {
                years--;
                months += 12;
            }

            return (years, months);
        }

        public string CompoundingIntervalStringFromValue(int interval)
        {
            string strInterval = Enums.CompoundingInterval.Quarterly.ToString();
            if (interval == (int)Enums.CompoundingInterval.Monthly)
                strInterval = Enums.CompoundingInterval.Monthly.ToString();
            else if (interval == (int)Enums.CompoundingInterval.Daily)
                strInterval = Enums.CompoundingInterval.Daily.ToString();
            else if (interval == (int)Enums.CompoundingInterval.Half_Yearly)
                strInterval = "Half-Yearly";
            else if (interval == (int)Enums.CompoundingInterval.Yearly)
                strInterval = Enums.CompoundingInterval.Yearly.ToString();
            else if (interval == (int)Enums.CompoundingInterval.Two_Yearly)
                strInterval = "Two-Yearly";
            else if (interval == (int)Enums.CompoundingInterval.NoCompounding)
                strInterval = "No-Compounding";
            return strInterval;
        }

        public int CompoundingIntervalFromString(string strInterval)
        {
            return strInterval switch
            {
                "Monthly" => (int)Enums.CompoundingInterval.Monthly,
                "Daily" => (int)Enums.CompoundingInterval.Daily,
                "Half-Yearly" => (int)Enums.CompoundingInterval.Half_Yearly,
                "Yearly" => (int)Enums.CompoundingInterval.Yearly,
                "Two-Yearly" => (int)Enums.CompoundingInterval.Two_Yearly,
                "No-Compounding" => (int)Enums.CompoundingInterval.NoCompounding,
                _ => (int)Enums.CompoundingInterval.Quarterly // Default
            };
        }

        public async Task<bool> AccountInUse(int accountId, int branchId)
        {
            bool result = false;
            if(accountId > 0 && branchId > 0)
            {
                result = await _appcontext.vouchercreditdebitdetails.Where(x => x.AccountId == accountId && x.BrId == branchId).AnyAsync();
            }
            return result;
        }

        // Reads workingDate from the current JWT claims.
        // Returns null if the token has no working date (e.g., user not yet logged into a session).
        public DateTime? GetWorkingDate()
        {
            var raw = _httpContextAccessor.HttpContext?.User?.FindFirst("workingDate")?.Value;
            if (string.IsNullOrWhiteSpace(raw)) return null;
            return DateTime.TryParseExact(raw, "dd-MMMM-yyyy",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out var d) ? d : null;
        }

        // Reads sessionFromDate and sessionToDate from the current JWT claims.
        // Returns (fromDate, toDate) as nullable DateTime — both null if no session is in the token.
        public (DateTime? From, DateTime? To) GetCurrentSessionDates()
        {
            var principal = _httpContextAccessor.HttpContext?.User;
            if (principal == null) return (null, null);

            var fromStr = principal.FindFirst("sessionFromDate")?.Value;
            var toStr   = principal.FindFirst("sessionToDate")?.Value;

            DateTime? from = DateTime.TryParse(fromStr, out var f) ? f : null;
            DateTime? to   = DateTime.TryParse(toStr,   out var t) ? t : null;

            return (from, to);
        }

        // Returns true if the account may be edited in the current session.
        // Rule: an account can only be modified in the session whose date range contains
        // the account's opening date — UNLESS the current session is the first session
        // (isfirst=true), in which case all accounts are always editable.
        public async Task<bool> CanModifyAccountInCurrentSession(int branchId, DateTime accOpeningDate)
        {
            var principal = _httpContextAccessor.HttpContext?.User;

            // If the logged-in session is the first session, always allow modification
            if (principal != null &&
                bool.TryParse(principal.FindFirst("isFirstSession")?.Value, out var isFirst) &&
                isFirst)
                return true;

            var (sessionFrom, sessionTo) = GetCurrentSessionDates();

            // No session in token — fall back to DB lookup
            if (sessionFrom == null || sessionTo == null)
            {
                var currentSession = await _appcontext.branchsession.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.branchid == branchId && x.iscurrent);
                if (currentSession == null) return true;
                if (currentSession.isfirst) return true;
                sessionFrom = currentSession.fromdate;
                sessionTo   = currentSession.todate;
            }

            // Account opened within the current session → editable
            if (accOpeningDate.Date >= sessionFrom.Value.Date && accOpeningDate.Date <= sessionTo.Value.Date)
                return true;

            // Account belongs to the first session → always editable
            var accountSession = await _appcontext.branchsession.AsNoTracking()
                .FirstOrDefaultAsync(x => x.branchid == branchId
                    && x.fromdate.Date <= accOpeningDate.Date
                    && x.todate.Date >= accOpeningDate.Date);

            if (accountSession?.isfirst == true) return true;

            return false;
        }
        public async Task<string> GetSavingAccInfoFromMemberIDandBranchID(int memberId, int memberBranchID, int accTypeId)
     => await _appcontext.accountmaster
         .AsNoTracking()
         .Where(x => x.MemberId == memberId && x.MemberBranchID == memberBranchID && x.AccTypeId == accTypeId)
         .Select(x => x.AccPrefix + "-" + x.AccSuffix + "-" + x.AccountName)
         .FirstOrDefaultAsync() ?? "";

        // <summary>
        // this gets the dob of member
        // </summary>
        public async Task<DateTime> MemberDOBFromMemberIdAndBranchId(int memberId, int memberBranchId) =>
            await _appcontext.member.Where(m => m.BranchId == memberBranchId && m.Id == memberId).Select(x => x.DOB).FirstOrDefaultAsync();

        public async Task<RDProductBranchWiseRuleDTO> GetRDProductBranchWiseRuleInfo(int branchId, int productId)
        {
            var rule = await _appcontext.rdproductbranchwiserule
                .FirstOrDefaultAsync(x => x.BrId == branchId && x.RDProductId == productId);

            if (rule == null) return new RDProductBranchWiseRuleDTO();

            return new RDProductBranchWiseRuleDTO
            {
                Id = rule.Id,
                BrId = rule.BrId,
                RDProductId = rule.RDProductId,
                IntFormula = rule.IntFormula,
                AccNoGeneration = rule.AccNoGeneration,
                PrintCertificate = rule.PrintCertificate == 1,
                KistAfterMaturity = rule.KistAfterMaturity == 1,
                PaymentDateType = rule.PaymentDateType,
                NoOfDayOrMonth = rule.NoOfDayOrMonth,
                IntExpAccId = rule.IntExpAccId,
                PenaltyIncAccId = rule.PenaltyIncAccId,
                ClosingChargesAcc = rule.ClosingChargesAcc,
            };
        }
        public async Task<(int headId, long headCode)> GetRDProductPrincipalHead(int branchId, int productId)
        {
            var data = await _appcontext.rdproductposting.AsNoTracking().Where(x => x.BrId == branchId && x.RDProductId == productId).FirstOrDefaultAsync();
            int headID = 0; long headCode = 0;
            if (data != null)
            {
                headID = await GetHeadIdFromHeadCode(branchId, (long)data.PrincipalBalHeadCode!);
                headCode = (long)data.PrincipalBalHeadCode!;
            }
            return (headID, headCode);

        }

        public string GetRDSlabNameFromID(int slabId, int branchId) => _appcontext.rdinterestslab.Where(x => x.BranchId == branchId && x.Id == slabId).Select(x => x.SlabName).FirstOrDefault() ?? "";

        public string GetRDProductNameFromId(int branchId, int productId) => _appcontext.rdproduct.Where(x => x.BrId == branchId && x.Id == productId).Select(x => x.ProductName).FirstOrDefault() ?? "";

        public async Task<LoanProductBranchWiseRuleDTO> GetLoanProductBranchWiseRuleInfo(int branchId, int productId)
        {
            var existingRule = await _appcontext.loanproductbranchwiserule
                .FirstOrDefaultAsync(s => s.BranchId == branchId && s.LoanProductId == productId);
            return new LoanProductBranchWiseRuleDTO
            {
                Id = existingRule?.Id,
                BranchId = branchId,
                LoanProductId = productId,
                MCLPlanId = existingRule?.MCLPlanId,
                NPAPlanId = existingRule?.NPAPlanId,
                LegalPlanId = existingRule?.LegalPlanId,
                OperatedBy = existingRule?.OperatedBy,
                AccNoOrNameFirst = existingRule?.AccNoOrNameFirst,
                TempRecAccId = existingRule?.TempRecAccId,
                CurrentRecoverableIntAcc = existingRule?.CurrentRecoverableIntAcc,
                IntIncomeAcc = existingRule?.IntIncomeAcc,
                OverdueRecoverableIntAcc = existingRule?.OverdueRecoverableIntAcc,
                IsApplyOverInt = existingRule?.IsApplyOverInt ?? 0,
                OVRIntProvAcc = existingRule?.OVRIntProvAcc ?? 0,
                IntwrtDepositPledge = existingRule?.IntwrtDepositPledge,
                OVRIntFromOpendate = existingRule?.OVRIntFromOpendate ?? 0,
                ActOnExpPosting = existingRule?.ActOnExpPosting,
            };
        }

    }
}
