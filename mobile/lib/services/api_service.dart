import 'dart:convert';
import 'package:http/http.dart' as http;
import 'secure_storage.dart';

// 10.0.2.2 = Android emulator → localhost. For web/Chrome testing use http://localhost:5009/api
const String kApiBase = 'http://localhost:5009/api';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  const ApiException(this.statusCode, this.message);
  @override
  String toString() => message;
}

class AgentApiService {
  Future<Map<String, String>> _authHeaders() async {
    final token = await secureStorage.getAccessToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool retry = true,
  }) async {
    final uri = Uri.parse('$kApiBase$path');
    final headers = await _authHeaders();

    http.Response res;
    try {
      switch (method) {
        case 'GET':
          res = await http.get(uri, headers: headers).timeout(const Duration(seconds: 20));
          break;
        case 'POST':
          res = await http.post(uri, headers: headers, body: jsonEncode(body)).timeout(const Duration(seconds: 20));
          break;
        default:
          throw ApiException(0, 'Unsupported method: $method');
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(0, 'Network error. Check your connection.');
    }

    if (res.statusCode == 401 && retry) {
      final refreshed = await _refreshToken();
      if (refreshed) return _request(method, path, body: body, retry: false);
      throw ApiException(401, 'Session expired. Please log in again.');
    }

    if (res.statusCode >= 400) {
      String msg = 'An error occurred (${res.statusCode})';
      try {
        final json = jsonDecode(res.body);
        msg = json['message'] ?? json['title'] ?? msg;
      } catch (_) {}
      throw ApiException(res.statusCode, msg);
    }

    if (res.body.isEmpty) return null;
    return jsonDecode(res.body);
  }

  Future<bool> _refreshToken() async {
    final refresh = await secureStorage.getRefreshToken();
    if (refresh == null) return false;
    try {
      final res = await http.post(
        Uri.parse('$kApiBase/agentauth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refresh}),
      ).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body);
        await secureStorage.updateAccessToken(json['accessToken'] as String);
        return true;
      }
    } catch (_) {}
    await secureStorage.clearSession();
    return false;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  Future<LoginResult> login(String username, String password) async {
    final data = await _request('POST', '/agentauth/login', body: {'username': username, 'password': password});
    return LoginResult.fromJson(data as Map<String, dynamic>);
  }

  Future<void> logout() async {
    try { await _request('POST', '/agentauth/revoke', body: {}); } catch (_) {}
    await secureStorage.clearSession();
  }

  // ── Accounts ──────────────────────────────────────────────────────────────

  Future<List<RDAccountDto>> getRDAccounts() async {
    final data = await _request('GET', '/agentmobile/rd-accounts');
    return (data as List).map((e) => RDAccountDto.fromJson(e)).toList();
  }

  Future<List<SavingAccountDto>> getSavingAccounts() async {
    final data = await _request('GET', '/agentmobile/saving-accounts');
    return (data as List).map((e) => SavingAccountDto.fromJson(e)).toList();
  }

  Future<List<LoanAccountDto>> getLoanAccounts() async {
    final data = await _request('GET', '/agentmobile/loan-accounts');
    return (data as List).map((e) => LoanAccountDto.fromJson(e)).toList();
  }

  // ── Collection ────────────────────────────────────────────────────────────

  Future<CollectionResult> postCollection({
    required int accountId,
    required String accType,
    required double amount,
    String? notes,
  }) async {
    final data = await _request('POST', '/agentmobile/post-collection', body: {
      'accountId': accountId,
      'accType': accType,
      'amount': amount,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    });
    return CollectionResult.fromJson(data as Map<String, dynamic>);
  }

  // ── Super agent summary ───────────────────────────────────────────────────

  Future<List<SuperAgentSummaryDto>> getSummary({String? date, String? accType}) async {
    final params = <String, String>{};
    if (date != null) params['date'] = date;
    if (accType != null) params['accType'] = accType;
    final uri = Uri.parse('$kApiBase/agentmobile/summary').replace(queryParameters: params.isNotEmpty ? params : null);
    final headers = await _authHeaders();
    final res = await http.get(uri, headers: headers).timeout(const Duration(seconds: 20));
    if (res.statusCode >= 400) throw ApiException(res.statusCode, 'Failed to load summary');
    return (jsonDecode(res.body) as List).map((e) => SuperAgentSummaryDto.fromJson(e)).toList();
  }
}

final agentApi = AgentApiService();

// ── DTOs ──────────────────────────────────────────────────────────────────────

class LoginResult {
  final String accessToken, refreshToken, agentName, branchName;
  final int agentId, agentMasterId, branchId;
  final bool isSuperAgent;

  const LoginResult({
    required this.accessToken, required this.refreshToken,
    required this.agentId, required this.agentMasterId,
    required this.branchId, required this.agentName,
    required this.branchName, required this.isSuperAgent,
  });

  factory LoginResult.fromJson(Map<String, dynamic> j) => LoginResult(
    accessToken:   j['accessToken']   as String,
    refreshToken:  j['refreshToken']  as String,
    agentId:       j['agentId']       as int,
    agentMasterId: j['agentMasterId'] as int,
    branchId:      j['branchId']      as int,
    agentName:     j['agentName']     as String,
    branchName:    j['branchName']    as String? ?? '',
    isSuperAgent:  j['isSuperAgent']  as bool? ?? false,
  );
}

class RDAccountDto {
  final int    accountId;
  final String accountNumber, accountName, relativeName, productName, mobileNumber;
  final double balance, kistAmount;

  const RDAccountDto({
    required this.accountId, required this.accountNumber, required this.accountName,
    required this.relativeName, required this.productName, required this.mobileNumber,
    required this.balance, required this.kistAmount,
  });

  factory RDAccountDto.fromJson(Map<String, dynamic> j) => RDAccountDto(
    accountId:     j['accountId']     as int,
    accountNumber: j['accountNo']     as String? ?? j['accountNumber'] as String? ?? '',
    accountName:   j['accountName']   as String? ?? '',
    relativeName:  j['relativeName']  as String? ?? '',
    productName:   j['productName']   as String? ?? '',
    mobileNumber:  j['mobileNumber']  as String? ?? '',
    balance:       (j['balance']    as num? ?? 0).toDouble(),
    kistAmount:    (j['kistAmount'] as num? ?? 0).toDouble(),
  );
}

class SavingAccountDto {
  final int    accountId;
  final String accountNumber, accountName, relativeName, productName, mobileNumber;
  final double balance;

  const SavingAccountDto({
    required this.accountId, required this.accountNumber, required this.accountName,
    required this.relativeName, required this.productName, required this.mobileNumber,
    required this.balance,
  });

  factory SavingAccountDto.fromJson(Map<String, dynamic> j) => SavingAccountDto(
    accountId:     j['accountId']     as int,
    accountNumber: j['accountNo']     as String? ?? j['accountNumber'] as String? ?? '',
    accountName:   j['accountName']   as String? ?? '',
    relativeName:  j['relativeName']  as String? ?? '',
    productName:   j['productName']   as String? ?? '',
    mobileNumber:  j['mobileNumber']  as String? ?? '',
    balance:       (j['balance']      as num? ?? 0).toDouble(),
  );
}

class LoanAccountDto {
  final int    accountId;
  final String accountNumber, accountName, relativeName, productName, loanType, mobileNumber;
  final double outstandingBalance, principalDue, interestDue;

  const LoanAccountDto({
    required this.accountId, required this.accountNumber, required this.accountName,
    required this.relativeName, required this.productName, required this.loanType,
    required this.mobileNumber, required this.outstandingBalance,
    required this.principalDue, required this.interestDue,
  });

  factory LoanAccountDto.fromJson(Map<String, dynamic> j) => LoanAccountDto(
    accountId:          j['accountId']           as int,
    accountNumber:      j['accountNo']           as String? ?? j['accountNumber'] as String? ?? '',
    accountName:        j['accountName']         as String? ?? '',
    relativeName:       j['relativeName']        as String? ?? '',
    productName:        j['productName']         as String? ?? '',
    loanType:           j['loanType']            as String? ?? 'AddInBalance',
    mobileNumber:       j['mobileNumber']        as String? ?? '',
    outstandingBalance: (j['outstandingBalance'] as num? ?? 0).toDouble(),
    principalDue:       (j['principalDue']       as num? ?? 0).toDouble(),
    interestDue:        (j['interestDue']        as num? ?? 0).toDouble(),
  );
}

class CollectionResult {
  final int    collectionId;
  final String receiptNo;
  final double amount;
  final String message;

  const CollectionResult({
    required this.collectionId,
    required this.receiptNo,
    required this.amount,
    required this.message,
  });

  factory CollectionResult.fromJson(Map<String, dynamic> j) => CollectionResult(
    collectionId: j['collectionId'] as int? ?? 0,
    receiptNo:    j['receiptNo']    as String? ?? '',
    amount:       (j['amount']      as num? ?? 0).toDouble(),
    message:      j['message']      as String? ?? 'Collection recorded successfully.',
  );
}

class SuperAgentSummaryDto {
  final String agentName, accType;
  final int    totalCollections;
  final double totalAmount;

  const SuperAgentSummaryDto({
    required this.agentName, required this.accType,
    required this.totalCollections, required this.totalAmount,
  });

  factory SuperAgentSummaryDto.fromJson(Map<String, dynamic> j) => SuperAgentSummaryDto(
    agentName:         j['agentName']         as String,
    accType:           j['accType']           as String,
    totalCollections:  j['totalCollections']  as int,
    totalAmount:       (j['totalAmount']      as num).toDouble(),
  );
}
