import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/societies.dart';

const String kSocietyUrlKey = 'society_base_url';

/// Returns the base URL saved at login, falling back to the first society.
Future<String> getBaseUrl() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString(kSocietyUrlKey) ?? kSocieties.first.baseUrl;
}

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

  static Future<Map<String, dynamic>> login(
      String phoneNo, String dob, String baseUrl) async {
    final res = await http.post(
      Uri.parse('$baseUrl/MemberPortal/login'),
      headers: _headers(),
      body: jsonEncode({'phoneNo': phoneNo, 'dateOfBirth': dob}),
    );
    return _decode(res);
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> getProfile() async {
    final base = await getBaseUrl();
    final token = await _getToken();
    final res = await http.get(
      Uri.parse('$base/MemberPortal/profile'),
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
    final base = await getBaseUrl();
    final token = await _getToken();
    final params = {
      'accountId': accountId.toString(),
      'accountType': accountType,
      'fromDate': fromDate,
      'toDate': toDate,
      if (fdDetailId != null) 'fdDetailId': fdDetailId.toString(),
    };
    final uri = Uri.parse('$base/MemberPortal/ledger').replace(queryParameters: params);
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
