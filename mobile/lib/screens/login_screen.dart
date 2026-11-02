import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';
import '../models.dart';
import '../services/api_service.dart';
import '../services/secure_storage.dart';
import 'dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _userCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _obscure = true;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tryAutoLogin();
  }

  Future<void> _tryAutoLogin() async {
    try {
      if (!await secureStorage.hasSession()) return;
    } catch (_) {
      return; // storage not available (e.g. web HTTP) — fall through to login screen
    }
    final token = await secureStorage.getAccessToken();
    if (token == null) return;
    final agentId    = await secureStorage.getAgentId();
    final agentName  = await secureStorage.getAgentName();
    final branchId   = await secureStorage.getBranchId();
    final branchName = await secureStorage.getBranchName();
    final isSu       = await secureStorage.isSuperAgent();
    if (agentId == null || branchId == null || !mounted) return;
    final info = AgentInfo(
      agentId: agentId, branchId: branchId,
      agentName: agentName ?? '', branchName: branchName ?? '',
      isSuperAgent: isSu,
    );
    Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => DashboardScreen(agent: info)));
  }

  Future<void> _login() async {
    final username = _userCtrl.text.trim();
    final password = _passCtrl.text;
    if (username.isEmpty || password.isEmpty) {
      setState(() => _error = 'Please enter your Agent ID and password.');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final result = await agentApi.login(username, password);
      await secureStorage.saveSession(
        accessToken:  result.accessToken,
        refreshToken: result.refreshToken,
        agentId:      result.agentId,
        agentName:    result.agentName,
        branchId:     result.branchId,
        branchName:   result.branchName,
        isSuperAgent: result.isSuperAgent,
      );
      if (!mounted) return;
      final info = AgentInfo(
        agentId:      result.agentId,
        branchId:     result.branchId,
        agentName:    result.agentName,
        branchName:   result.branchName,
        isSuperAgent: result.isSuperAgent,
      );
      Navigator.pushReplacement(context, PageRouteBuilder(
        pageBuilder: (_, a, __) => DashboardScreen(agent: info),
        transitionsBuilder: (_, anim, __, child) => FadeTransition(opacity: anim, child: child),
        transitionDuration: const Duration(milliseconds: 350),
      ));
    } on ApiException catch (e) {
      setState(() { _error = e.message; _loading = false; });
    } catch (_) {
      setState(() { _error = 'An unexpected error occurred.'; _loading = false; });
    }
  }

  @override
  void dispose() {
    _userCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final h = MediaQuery.of(context).size.height;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SingleChildScrollView(
        child: Column(
          children: [
            // ── Hero header ───────────────────────────────────────────────
            Container(
              width: double.infinity,
              height: h * 0.36,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF1E3A8A), Color(0xFF1D4ED8), Color(0xFF2563EB)],
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(40)),
              ),
              child: SafeArea(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 72, height: 72,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.35), width: 1.5),
                      ),
                      child: const Icon(Icons.account_balance_rounded, color: Colors.white, size: 34),
                    ).animate().scale(duration: 600.ms, curve: Curves.elasticOut),
                    const SizedBox(height: 16),
                    RichText(
                      text: TextSpan(children: [
                        TextSpan(text: 'Sicswave ', style: GoogleFonts.dmSans(fontSize: 26, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: -0.5)),
                        TextSpan(text: 'Fincore',   style: GoogleFonts.dmSans(fontSize: 26, fontWeight: FontWeight.w300, color: Colors.white.withValues(alpha: 0.85), letterSpacing: -0.5)),
                      ]),
                    ).animate().fadeIn(delay: 150.ms).slideY(begin: 0.3),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
                      ),
                      child: Text(
                        'Member Collection Suite',
                        style: GoogleFonts.dmSans(fontSize: 11, color: Colors.white, letterSpacing: 0.5, fontWeight: FontWeight.w500),
                      ),
                    ).animate().fadeIn(delay: 250.ms),
                  ],
                ),
              ),
            ),

            // ── Login card ────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 28, 20, 0),
              child: Container(
                padding: const EdgeInsets.all(28),
                decoration: AppColors.card(radius: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Welcome back', style: GoogleFonts.dmSans(fontSize: 21, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                    const SizedBox(height: 4),
                    Text('Sign in to start your collection round', style: GoogleFonts.dmSans(fontSize: 13, color: AppColors.textSecondary)),

                    const SizedBox(height: 28),

                    _label('Agent ID'),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _userCtrl,
                      style: GoogleFonts.dmSans(fontSize: 14, color: AppColors.textPrimary),
                      decoration: InputDecoration(
                        hintText: 'Enter your agent username',
                        prefixIcon: const Icon(Icons.badge_rounded, size: 19, color: AppColors.textSecondary),
                      ),
                    ),

                    const SizedBox(height: 18),

                    _label('Password'),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _passCtrl,
                      obscureText: _obscure,
                      onFieldSubmitted: (_) => _login(),
                      style: GoogleFonts.dmSans(fontSize: 14, color: AppColors.textPrimary),
                      decoration: InputDecoration(
                        hintText: '••••••••',
                        prefixIcon: const Icon(Icons.lock_rounded, size: 19, color: AppColors.textSecondary),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscure ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                            size: 19, color: AppColors.textSecondary,
                          ),
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                      ),
                    ),

                    if (_error != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.danger.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                        ),
                        child: Row(children: [
                          const Icon(Icons.error_outline_rounded, color: AppColors.danger, size: 16),
                          const SizedBox(width: 8),
                          Expanded(child: Text(_error!, style: GoogleFonts.dmSans(color: AppColors.danger, fontSize: 12))),
                        ]),
                      ),
                    ],

                    const SizedBox(height: 28),

                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _login,
                        child: _loading
                            ? const SizedBox(width: 22, height: 22,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                            : Text('Sign In', style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.15),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _label(String text) => Text(
    text,
    style: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary, letterSpacing: 0.3),
  );
}
