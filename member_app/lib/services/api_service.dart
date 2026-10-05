import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

// Use HTTP in dev to avoid untrusted self-signed cert on localhost
const String kBaseUrl = 'http://localhost:5009/api';

class ApiService {
  static Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('member_token');
  }

  static Map<String, String> _headers({String? token}) => {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
  };

  // ── Auth ─────────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> login(String phoneNo, String dob) async {
    final res = await http.post(
      Uri.parse('$kBaseUrl/MemberPortal/login'),
      headers: _headers(),
      body: jsonEncode({'phoneNo': phoneNo, 'dateOfBirth': dob}),
    );
    return _decode(res);
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> getProfile() async {
    final token = await _getToken();
    final res = await http.get(
      Uri.parse('$kBaseUrl/MemberPortal/profile'),
      headers: _headers(token: token),
    );
    return _decode(res);
  }

  // ── Ledger ────────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> getLedger({
    required int accountId,
    required String accountType,
    required String fromDate,
    required String toDate,
    int? fdDetailId,
  }) async {
    final token = await _getToken();
    final params = {
      'accountId': accountId.toString(),
      'accountType': accountType,
      'fromDate': fromDate,
      'toDate': toDate,
      if (fdDetailId != null) 'fdDetailId': fdDetailId.toString(),
    };
    final uri = Uri.parse('$kBaseUrl/MemberPortal/ledger').replace(queryParameters: params);
    final res = await http.get(uri, headers: _headers(token: token));
    return _decode(res);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  static Map<String, dynamic> _decode(http.Response res) {
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 400) {
      throw ApiException(body['message'] ?? 'Request failed (${res.statusCode})');
    }
    return body;
  }
}

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}
