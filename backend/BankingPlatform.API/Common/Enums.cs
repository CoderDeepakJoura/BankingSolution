namespace BankingPlatform.API.Common
{
    public class Enums
    {
        public enum DayStatus
        {
            Begin = 1,
            End = 2
        }
        public enum AccountTypes
        {
            Loan = 1,
            Saving = 2,
            General = 3,
            ShareMoney = 4,
            RD = 5,
            FD = 6,
            BankFD = 7
        }
        public enum VoucherType
        {
            Member = 1,
            Saving = 2,
            FD = 3,
            RD = 4,
            Loan = 5,
            Cash = 6,
            Journal = 7,
            OdReserve = 8,
            InterBranch = 9,
            BankFD = 10,
        }

        public enum VoucherSubType
        {
            ShareMoney = 1,
            Deposit = 2,
            Withdrawal = 3,
            InterestPosting = 4,
            Mature = 5,
            Renew = 6,
            PreMature = 7,
            Kist = 8,
            LoanAdvancement = 9,
            LoanRecovery = 10,
            PaymentReceipt = 11,
            Transfer = 12,
            OdReservePosting = 13,
            LoanExpense = 14,
            MISInterestPosting = 15,
            MultipleKist = 16,
            IBSavingDeposit = 17,       // legacy — do not use for new entries
            IBSavingWithdrawal = 18,    // legacy — do not use for new entries

            // HO-to-Branch 2-step saving deposit
            IBHOSavDepStep1 = 19,       // HO: Dr Cash, Cr Dest-Branch-Ref
            IBHOSavDepStep2 = 20,       // Dest Branch: Dr HO-Ref, Cr Customer Saving Acc

            // Branch-to-Branch 3-step saving deposit
            IBBrSavDepStep1 = 21,       // Source Branch: Dr Cash, Cr HO-Ref
            IBBrSavDepStep2 = 22,       // HO: Dr Source-Ref, Cr Dest-Ref
            IBBrSavDepStep3 = 23,       // Dest Branch: Dr HO-Ref, Cr Customer Saving Acc

            // HO-to-Branch 2-step saving withdrawal (reverse of deposit)
            IBHOSavWdlStep1 = 24,       // HO: Dr Dest-Branch-Ref, Cr Cash
            IBHOSavWdlStep2 = 25,       // Dest Branch: Dr Customer Saving Acc, Cr HO-Ref

            // Branch-to-Branch 3-step saving withdrawal (reverse of deposit)
            IBBrSavWdlStep1 = 26,       // Source Branch: Dr HO-Ref, Cr Cash
            IBBrSavWdlStep2 = 27,       // HO: Dr Dest-Ref, Cr Source-Ref
            IBBrSavWdlStep3 = 28,       // Dest Branch: Dr Customer Saving Acc, Cr HO-Ref

            CloseAccount = 29,          // Account closure — single combined voucher (saving, RD, FD, etc.)
            BankFDDeposit = 30,         // Bank FD account creation deposit voucher

            // HO-to-Branch 2-step loan advancement (cash given at HO/source, loan at dest)
            IBHOLoanAdvStep1 = 31,      // HO: Dr=IB-Ref(DestBr), Cr=Cash
            IBHOLoanAdvStep2 = 32,      // Dest Branch: Dr=LoanAccount(LA), Cr=HO-Ref

            // Branch-to-Branch 3-step loan advancement
            IBBrLoanAdvStep1 = 33,      // Source Branch: Dr=IB-Ref(HO), Cr=Cash
            IBBrLoanAdvStep2 = 34,      // HO: Dr=Dest-Ref, Cr=Source-Ref
            IBBrLoanAdvStep3 = 35,      // Dest Branch: Dr=LoanAccount(LA), Cr=HO-Ref

            // HO-to-Branch 2-step loan expense (cash collected at HO/source, loan at dest)
            IBHOLoanExpStep1 = 36,      // HO: Dr=IB-Ref(DestBr), Cr=CrAcc (expense collected)
            IBHOLoanExpStep2 = 37,      // Dest Branch: Dr=LoanAccount(LA), Cr=HO-Ref + loanexpense record

            // Branch-to-Branch 3-step loan expense
            IBBrLoanExpStep1 = 38,      // Source Branch: Dr=IB-Ref(HO), Cr=CrAcc (expense collected)
            IBBrLoanExpStep2 = 39,      // HO: Dr=Dest-Ref, Cr=Source-Ref
            IBBrLoanExpStep3 = 40,      // Dest Branch: Dr=LoanAccount(LA), Cr=HO-Ref + loanexpense record

            // HO-to-Branch 2-step pre-mature FD/RD (saving credit at dest branch)
            IBHOPreMatureStep1 = 41,    // Source/HO: Dr=FD/RD Account, Cr=IB-Ref(DestBr)
            IBHOPreMatureStep2 = 42,    // Dest Branch: Dr=HO-Ref, Cr=Customer Saving Acc

            // Branch-to-Branch 3-step pre-mature FD/RD
            IBBrPreMatureStep1 = 43,    // Source Branch: Dr=FD/RD Account, Cr=IB-Ref(HO)
            IBBrPreMatureStep2 = 44,    // HO: Dr=Source-Ref, Cr=Dest-Ref
            IBBrPreMatureStep3 = 45,    // Dest Branch: Dr=HO-Ref, Cr=Customer Saving Acc

            // HO-to-Branch 2-step mature FD/RD (saving credit at dest branch)
            IBHOMatureStep1 = 46,       // Source/HO: Dr=FD/RD Account, Cr=IB-Ref(DestBr)
            IBHOMatureStep2 = 47,       // Dest Branch: Dr=HO-Ref, Cr=Customer Saving Acc

            // Branch-to-Branch 3-step mature FD/RD
            IBBrMatureStep1 = 48,       // Source Branch: Dr=FD/RD Account, Cr=IB-Ref(HO)
            IBBrMatureStep2 = 49,       // HO: Dr=Source-Ref, Cr=Dest-Ref
            IBBrMatureStep3 = 50,       // Dest Branch: Dr=HO-Ref, Cr=Customer Saving Acc

            // HO-to-Branch 2-step RD Kist (kist collected at source/HO, posted at dest)
            IBHORDKistStep1 = 51,       // Source/HO: Dr=Cash, Cr=IB-Ref(DestBr)
            IBHORDKistStep2 = 52,       // Dest Branch: Dr=HO-Ref, Cr=RD Account + voucherrddetail RC

            // Branch-to-Branch 3-step RD Kist
            IBBrRDKistStep1 = 53,       // Source Branch: Dr=Cash, Cr=IB-Ref(HO)
            IBBrRDKistStep2 = 54,       // HO: Dr=Source-Ref, Cr=Dest-Ref
            IBBrRDKistStep3 = 55,       // Dest Branch: Dr=HO-Ref, Cr=RD Account + voucherrddetail RC

            // HO-to-Branch 2-step loan recovery (cash received at HO/source, loan at dest)
            IBHOLoanRecStep1 = 56,      // Source/HO: Dr=Cash/Saving (multi), Cr=IB-Ref(DestBr)
            IBHOLoanRecStep2 = 57,      // Dest Branch: Dr=HO-Ref, Cr=LoanAccount + interest

            // Branch-to-Branch 3-step loan recovery
            IBBrLoanRecStep1 = 58,      // Source Branch: Dr=Cash/Saving (multi), Cr=IB-Ref(HO)
            IBBrLoanRecStep2 = 59,      // HO: Dr=Source-Ref, Cr=Dest-Ref
            IBBrLoanRecStep3 = 60,      // Dest Branch: Dr=HO-Ref, Cr=LoanAccount + interest
        }

        public enum VoucherStatus
        {
            MemberSM = 1,
            AdmissionFee = 2,
            Dr = 3,
            Cr = 4,
            FDCr = 5,
            FDDr = 6,
            LA = 7,
            LR = 8,
            RDCr = 9,
            RDDr = 10,
        }

        public enum IntCategory
        {
            StdInterest = 1,
            PenalInterest = 2,
            StdRecoverable = 3,
            OverdueRecoverable = 4,
        }

        public enum MemberType
        {
            Nominal = 1,
            Permanent = 2
        }

        public enum AccountTypeOfFDProduct
        {
            SameAccount = 1,
            OtherAccount = 2
        }
        public enum CompoundingInterval
        {
            NoCompounding = 1,
            Daily = 2,
            Monthly = 3,
            Quarterly = 4, 
            Half_Yearly = 5,
            Yearly = 6,
            Two_Yearly = 7
        }

        public enum FDStatus
        {
            Open = 1,
            Matured = 2,
            Pre_Matured = 3,
            Renewed = 4,
        }

        public enum PledgeStatus
        {
            Pledge = 1,
            Unpledge = 2,
            Lock = 3,
            Unlock = 4,
        }
    }
}
