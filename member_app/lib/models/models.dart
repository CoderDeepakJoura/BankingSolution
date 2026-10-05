class MemberAccount {
  final int accountId;
  final String accountType;   // Saving, RD, FD, Loan, ShareMoney
  final int accTypeId;
  final String accountIdentifier;
  final String accountName;
  final double balance;
  final bool isClosed;

  const MemberAccount({
    required this.accountId,
    required this.accountType,
    required this.accTypeId,
    required this.accountIdentifier,
    required this.accountName,
    required this.balance,
    required this.isClosed,
  });

  factory MemberAccount.fromJson(Map<String, dynamic> j) => MemberAccount(
    accountId: j['accountId'] as int,
    accountType: j['accountType'] as String,
    accTypeId: j['accTypeId'] as int,
    accountIdentifier: j['accountIdentifier'] as String? ?? '',
    accountName: j['accountName'] as String? ?? '',
    balance: (j['balance'] as num).toDouble(),
    isClosed: j['isClosed'] as bool? ?? false,
  );
}

class MemberProfile {
  final int memberId;
  final int branchId;
  final String memberName;
  final String? membershipNo;
  final String? phoneNo;
  final String? email;
  final DateTime dob;
  final String branchName;
  final List<MemberAccount> accounts;

  const MemberProfile({
    required this.memberId,
    required this.branchId,
    required this.memberName,
    this.membershipNo,
    this.phoneNo,
    this.email,
    required this.dob,
    required this.branchName,
    required this.accounts,
  });

  factory MemberProfile.fromJson(Map<String, dynamic> j) => MemberProfile(
    memberId: j['memberId'] as int,
    branchId: j['branchId'] as int,
    memberName: j['memberName'] as String,
    membershipNo: j['membershipNo'] as String?,
    phoneNo: j['phoneNo'] as String?,
    email: j['email'] as String?,
    dob: DateTime.parse(j['dob'] as String),
    branchName: j['branchName'] as String? ?? '',
    accounts: (j['accounts'] as List)
        .map((a) => MemberAccount.fromJson(a as Map<String, dynamic>))
        .toList(),
  );
}

class LedgerEntry {
  final int voucherNo;
  final DateTime voucherDate;
  final String particulars;
  final double? dr;
  final double? cr;
  final double balance;
  final String? narration;

  const LedgerEntry({
    required this.voucherNo,
    required this.voucherDate,
    required this.particulars,
    this.dr,
    this.cr,
    required this.balance,
    this.narration,
  });

  factory LedgerEntry.fromJson(Map<String, dynamic> j) => LedgerEntry(
    voucherNo: j['voucherNo'] as int? ?? 0,
    voucherDate: DateTime.parse(j['voucherDate'] as String),
    particulars: j['particulars'] as String? ?? '',
    dr: j['dr'] != null ? (j['dr'] as num).toDouble() : null,
    cr: j['cr'] != null ? (j['cr'] as num).toDouble() : null,
    balance: (j['balance'] as num).toDouble(),
    narration: j['narration'] as String?,
  );
}

class LedgerData {
  final String accountName;
  final String accountIdentifier;
  final double openingBalance;
  final List<LedgerEntry> entries;
  final double totalDr;
  final double totalCr;
  final double closingBalance;

  const LedgerData({
    required this.accountName,
    required this.accountIdentifier,
    required this.openingBalance,
    required this.entries,
    required this.totalDr,
    required this.totalCr,
    required this.closingBalance,
  });

  factory LedgerData.fromJson(Map<String, dynamic> j) => LedgerData(
    accountName: j['accountName'] as String? ?? '',
    accountIdentifier: j['accountIdentifier'] as String? ?? '',
    openingBalance: (j['openingBalance'] as num).toDouble(),
    entries: (j['entries'] as List)
        .map((e) => LedgerEntry.fromJson(e as Map<String, dynamic>))
        .toList(),
    totalDr: (j['totalDr'] as num).toDouble(),
    totalCr: (j['totalCr'] as num).toDouble(),
    closingBalance: (j['closingBalance'] as num).toDouble(),
  );
}
