import 'services/api_service.dart';

// Agent session info — loaded from secure storage after login
class AgentInfo {
  final int    agentId, branchId;
  final String agentName, branchName;
  final bool   isSuperAgent;

  const AgentInfo({
    required this.agentId,    required this.branchId,
    required this.agentName,  required this.branchName,
    required this.isSuperAgent,
  });

  String get avatarInitials => agentName.trim().split(' ')
      .where((p) => p.isNotEmpty).take(2).map((p) => p[0].toUpperCase()).join();
}

// ── Working models (backed by API DTOs) ───────────────────────────────────────

class RDAccount {
  final int    accountId;
  final String accountNumber, accountName, relativeName, productName, mobileNumber;
  final double balance, kistAmount;
  double? collectedAmount;

  RDAccount.fromDto(RDAccountDto d)
      : accountId     = d.accountId,
        accountNumber = d.accountNumber,
        accountName   = d.accountName,
        relativeName  = d.relativeName,
        productName   = d.productName,
        mobileNumber  = d.mobileNumber,
        balance       = d.balance,
        kistAmount    = d.kistAmount;
}

class SavingAccount {
  final int    accountId;
  final String accountNumber, accountName, relativeName, productName, mobileNumber;
  final double balance;
  double? transactionAmount;

  SavingAccount.fromDto(SavingAccountDto d)
      : accountId     = d.accountId,
        accountNumber = d.accountNumber,
        accountName   = d.accountName,
        relativeName  = d.relativeName,
        productName   = d.productName,
        mobileNumber  = d.mobileNumber,
        balance       = d.balance;
}

enum LoanType { addInBalance, stand }

class LoanAccount {
  final int      accountId;
  final String   accountNumber, accountName, relativeName, productName, mobileNumber;
  final LoanType loanType;
  final double   outstandingBalance, principalDue, interestDue;
  double? recoveryAmount;

  LoanAccount.fromDto(LoanAccountDto d)
      : accountId          = d.accountId,
        accountNumber      = d.accountNumber,
        accountName        = d.accountName,
        relativeName       = d.relativeName,
        productName        = d.productName,
        mobileNumber       = d.mobileNumber,
        loanType           = d.loanType.toLowerCase() == 'stand' ? LoanType.stand : LoanType.addInBalance,
        outstandingBalance = d.outstandingBalance,
        principalDue       = d.principalDue,
        interestDue        = d.interestDue;
}

class CollectionReceipt {
  final int    collectionId;
  final String accountNumber, accountName, accountType, agentName, mobileNumber;
  final double amount;
  final DateTime collectionDate;

  const CollectionReceipt({
    required this.collectionId,
    required this.accountNumber, required this.accountName,
    required this.accountType,   required this.agentName,
    required this.mobileNumber,  required this.amount,
    required this.collectionDate,
  });
}
