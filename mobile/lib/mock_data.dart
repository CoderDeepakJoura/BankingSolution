import 'models.dart';

const demoAgent = AgentModel(
  id: 'agent001',
  name: 'Ramesh Kumar',
  branchName: 'Main Branch',
  zone: 'Zone A — North Sector',
  avatarInitials: 'RK',
);

List<RDAccount> getRDAccounts() => [
      RDAccount(sno: 1, accountNumber: '14-001', accountName: 'Suresh Patel', relativeName: 'Mahesh Patel', productName: 'Regular RD', balance: 12000, kistAmount: 500, mobileNumber: '9876543210'),
      RDAccount(sno: 2, accountNumber: '14-007', accountName: 'Anita Sharma', relativeName: 'Rajesh Sharma', productName: 'Regular RD', balance: 6000, kistAmount: 1000, mobileNumber: '9812345678'),
      RDAccount(sno: 3, accountNumber: '14-012', accountName: 'Vinod Gupta', relativeName: 'Dinesh Gupta', productName: 'Premium RD', balance: 24000, kistAmount: 2000, mobileNumber: '9845671230'),
      RDAccount(sno: 4, accountNumber: '14-019', accountName: 'Kavita Verma', relativeName: 'Sunil Verma', productName: 'Regular RD', balance: 3500, kistAmount: 500, mobileNumber: ''),
      RDAccount(sno: 5, accountNumber: '14-023', accountName: 'Prakash Joshi', relativeName: 'Ramesh Joshi', productName: 'Premium RD', balance: 48000, kistAmount: 3000, mobileNumber: '9900112233'),
      RDAccount(sno: 6, accountNumber: '14-031', accountName: 'Meena Yadav', relativeName: 'Ajay Yadav', productName: 'Regular RD', balance: 9000, kistAmount: 1500, mobileNumber: '9988776655'),
    ];

List<SavingAccount> getSavingAccounts() => [
      SavingAccount(sno: 1, accountNumber: '02-004', accountName: 'Deepak Singh', relativeName: 'Harish Singh', productName: 'Regular Saving', balance: 8200, mobileNumber: '9876543210'),
      SavingAccount(sno: 2, accountNumber: '02-009', accountName: 'Sunita Devi', relativeName: 'Kamlesh Devi', productName: 'Regular Saving', balance: 15500, mobileNumber: '9811122233'),
      SavingAccount(sno: 3, accountNumber: '02-017', accountName: 'Mohan Lal', relativeName: 'Sohan Lal', productName: 'Premium Saving', balance: 42000, mobileNumber: ''),
      SavingAccount(sno: 4, accountNumber: '02-024', accountName: 'Ritu Agarwal', relativeName: 'Piyush Agarwal', productName: 'Regular Saving', balance: 5300, mobileNumber: '9700011223'),
      SavingAccount(sno: 5, accountNumber: '02-038', accountName: 'Hemant Tiwari', relativeName: 'Shyam Tiwari', productName: 'Regular Saving', balance: 23100, mobileNumber: '9955443322'),
    ];

List<LoanAccount> getLoanAccounts() => [
      LoanAccount(sno: 1, accountNumber: '05-002', accountName: 'Rajiv Mishra', relativeName: 'Vijay Mishra', productName: 'Personal Loan', loanType: LoanType.stand, outstandingBalance: 45000, principalDue: 2000, interestDue: 375, mobileNumber: '9876543210'),
      LoanAccount(sno: 2, accountNumber: '05-008', accountName: 'Geeta Rani', relativeName: 'Om Prakash', productName: 'Gold Loan', loanType: LoanType.addInBalance, outstandingBalance: 28000, principalDue: 1500, interestDue: 0, mobileNumber: '9812345678'),
      LoanAccount(sno: 3, accountNumber: '05-015', accountName: 'Santosh Kumar', relativeName: 'Ramji Kumar', productName: 'Personal Loan', loanType: LoanType.stand, outstandingBalance: 62000, principalDue: 3000, interestDue: 517, mobileNumber: ''),
      LoanAccount(sno: 4, accountNumber: '05-021', accountName: 'Pushpa Devi', relativeName: 'Shiv Narayan', productName: 'Business Loan', loanType: LoanType.addInBalance, outstandingBalance: 120000, principalDue: 5000, interestDue: 0, mobileNumber: '9944332211'),
      LoanAccount(sno: 5, accountNumber: '05-029', accountName: 'Ashok Pandey', relativeName: 'Ganga Ram', productName: 'Personal Loan', loanType: LoanType.stand, outstandingBalance: 18500, principalDue: 1000, interestDue: 154, mobileNumber: '9700001112'),
    ];
