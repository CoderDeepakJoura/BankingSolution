import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SecureStorageService {
  // Do not create FlutterSecureStorage on web — its web impl calls Web Crypto
  // on init which throws OperationError on plain HTTP.
  static final FlutterSecureStorage? _storage = kIsWeb
      ? null
      : const FlutterSecureStorage(
          aOptions: AndroidOptions(encryptedSharedPreferences: true),
        );

  // On web, flutter_secure_storage uses Web Crypto which fails on plain HTTP.
  // Fall back to shared_preferences (less secure but fine for dev/web testing).
  Future<void> _write(String key, String value) async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(key, value);
    } else {
      await _storage!.write(key: key, value: value);
    }
  }

  Future<String?> _read(String key) async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(key);
    }
    return _storage!.read(key: key);
  }

  Future<void> _delete(String key) async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(key);
    } else {
      await _storage!.delete(key: key);
    }
  }

  static const _kToken        = 'agent_access_token';
  static const _kRefresh      = 'agent_refresh_token';
  static const _kAgentId      = 'agent_id';
  static const _kAgentName    = 'agent_name';
  static const _kBranchId     = 'agent_branch_id';
  static const _kBranchName   = 'agent_branch_name';
  static const _kIsSuperAgent = 'agent_is_super';

  Future<void> saveSession({
    required String accessToken,
    required String refreshToken,
    required int agentId,
    required String agentName,
    required int branchId,
    required String branchName,
    required bool isSuperAgent,
  }) async {
    await Future.wait([
      _write(_kToken,        accessToken),
      _write(_kRefresh,      refreshToken),
      _write(_kAgentId,      agentId.toString()),
      _write(_kAgentName,    agentName),
      _write(_kBranchId,     branchId.toString()),
      _write(_kBranchName,   branchName),
      _write(_kIsSuperAgent, isSuperAgent.toString()),
    ]);
  }

  Future<String?> getAccessToken()  => _read(_kToken);
  Future<String?> getRefreshToken() => _read(_kRefresh);
  Future<int?>    getAgentId()      async => int.tryParse(await _read(_kAgentId) ?? '');
  Future<String?> getAgentName()    => _read(_kAgentName);
  Future<int?>    getBranchId()     async => int.tryParse(await _read(_kBranchId) ?? '');
  Future<String?> getBranchName()   => _read(_kBranchName);
  Future<bool>    isSuperAgent()    async => (await _read(_kIsSuperAgent)) == 'true';

  Future<bool> hasSession() async => (await _read(_kToken)) != null;

  Future<void> updateAccessToken(String token) => _write(_kToken, token);

  Future<void> clearSession() async {
    await Future.wait([
      _delete(_kToken),
      _delete(_kRefresh),
      _delete(_kAgentId),
      _delete(_kAgentName),
      _delete(_kBranchId),
      _delete(_kBranchName),
      _delete(_kIsSuperAgent),
    ]);
  }
}

final secureStorage = SecureStorageService();
