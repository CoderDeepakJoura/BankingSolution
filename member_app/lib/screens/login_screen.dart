import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/societies.dart';
import '../services/api_service.dart';
import '../theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneCtrl = TextEditingController();
  final _dobCtrl = TextEditingController();
  DateTime? _selectedDob;
  bool _loading = false;
  String? _error;
  Society _selectedSociety = kSocieties.first;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _dobCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDob ?? DateTime(now.year - 30),
      firstDate: DateTime(1920),
      lastDate: now,
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: Theme.of(ctx).colorScheme.copyWith(primary: AppColors.primary),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() {
        _selectedDob = picked;
        _dobCtrl.text = DateFormat('dd MMM yyyy').format(picked);
      });
    }
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedDob == null) {
      setState(() => _error = 'Please select your date of birth.');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final dob = DateFormat('yyyy-MM-dd').format(_selectedDob!);
      final res = await ApiService.login(_phoneCtrl.text.trim(), dob, _selectedSociety.baseUrl);
      if (res['success'] == true) {
        final data = res['data'] as Map<String, dynamic>;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(kSocietyUrlKey, _selectedSociety.baseUrl);
        await prefs.setString('society_name', _selectedSociety.name);
        await prefs.setString('member_token', data['token'] as String);
        await prefs.setString('member_name', data['memberName'] as String);
        await prefs.setInt('member_id', data['memberId'] as int);
        await prefs.setInt('branch_id', data['branchId'] as int);
        if (mounted) Navigator.pushReplacementNamed(context, '/dashboard');
      } else {
        setState(() => _error = res['message'] as String? ?? 'Login failed.');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    final isWide = w > 800;

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      body: isWide ? _buildWide() : _buildNarrow(),
    );
  }

  // ── Wide (desktop/tablet) ─────────────────────────────────────────────────
  Widget _buildWide() => Row(
    children: [
      Expanded(flex: 5, child: _buildBrandPanel()),
      Expanded(
        flex: 4,
        child: Container(
          color: Colors.white,
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 40),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 380),
                child: _buildForm(),
              ),
            ),
          ),
        ),
      ),
    ],
  );

  // ── Narrow (mobile) ───────────────────────────────────────────────────────
  Widget _buildNarrow() => Column(
    children: [
      _buildNarrowHeader(),
      Expanded(
        child: Container(
          width: double.infinity,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(28, 32, 28, 28),
            child: _buildForm(),
          ),
        ),
      ),
    ],
  );

  Widget _buildNarrowHeader() => Container(
    width: double.infinity,
    padding: const EdgeInsets.fromLTRB(28, 56, 28, 36),
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        colors: [Color(0xFF0F3460), Color(0xFF1A56DB)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Logo row
        Row(
          children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.account_balance_rounded, color: AppColors.primary, size: 26),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('SICSWAVE',
                  style: GoogleFonts.inter(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800,
                    letterSpacing: 1.5)),
                Text('FINCORE',
                  style: GoogleFonts.inter(color: Colors.white.withOpacity(0.65), fontSize: 10,
                    fontWeight: FontWeight.w600, letterSpacing: 3)),
              ],
            ),
          ],
        ),
        const SizedBox(height: 24),
        Text('Member\nPortal',
          style: GoogleFonts.inter(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800,
            height: 1.15, letterSpacing: -0.5)),
        const SizedBox(height: 8),
        Text('Access your accounts, view ledgers\nand track all transactions.',
          style: GoogleFonts.inter(color: Colors.white.withOpacity(0.7), fontSize: 13, height: 1.6)),
      ],
    ),
  );

  Widget _buildBrandPanel() => Container(
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        colors: [Color(0xFF0F3460), Color(0xFF1A56DB)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
    ),
    padding: const EdgeInsets.symmetric(horizontal: 56, vertical: 48),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Logo
        Row(
          children: [
            Container(
              width: 52, height: 52,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 12, offset: const Offset(0, 4)),
                ],
              ),
              child: const Icon(Icons.account_balance_rounded, color: AppColors.primary, size: 30),
            ),
            const SizedBox(width: 14),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('SICSWAVE',
                  style: GoogleFonts.inter(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800,
                    letterSpacing: 2)),
                Text('FINCORE',
                  style: GoogleFonts.inter(color: Colors.white.withOpacity(0.55), fontSize: 11,
                    fontWeight: FontWeight.w600, letterSpacing: 4)),
              ],
            ),
          ],
        ),

        const Spacer(),

        // Headline
        Text('Banking\nmade simple.',
          style: GoogleFonts.inter(
            color: Colors.white,
            fontSize: 42,
            fontWeight: FontWeight.w800,
            height: 1.15,
            letterSpacing: -1,
          ),
        ),
        const SizedBox(height: 16),
        Text('Your complete cooperative banking experience\nin one secure member portal.',
          style: GoogleFonts.inter(color: Colors.white.withOpacity(0.65), fontSize: 15, height: 1.65)),

        const SizedBox(height: 48),

        // Feature bullets
        ...[
          (Icons.account_balance_wallet_rounded, 'View all your savings, RD, FD & loan accounts'),
          (Icons.receipt_long_rounded, 'Check full transaction ledger with date filters'),
          (Icons.picture_as_pdf_rounded, 'Download PDF statements anytime'),
          (Icons.lock_rounded, 'Secured with JWT authentication'),
        ].map((f) => Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Row(
            children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(f.$1, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(f.$2,
                  style: GoogleFonts.inter(color: Colors.white.withOpacity(0.8), fontSize: 13)),
              ),
            ],
          ),
        )),

        const Spacer(),

        // Footer
        Text('© 2025 Sicswave Technologies. All rights reserved.',
          style: GoogleFonts.inter(color: Colors.white.withOpacity(0.3), fontSize: 11)),
      ],
    ),
  );

  // ── Form ──────────────────────────────────────────────────────────────────
  Widget _buildForm() => Form(
    key: _formKey,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Welcome back',
          style: GoogleFonts.inter(fontSize: 26, fontWeight: FontWeight.w800,
            color: const Color(0xFF0F172A), letterSpacing: -0.5)),
        const SizedBox(height: 6),
        Text('Sign in with your registered mobile & date of birth',
          style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade500, height: 1.5)),

        const SizedBox(height: 32),

        // Society selector
        _fieldLabel('Select Society'),
        const SizedBox(height: 6),
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<Society>(
              value: _selectedSociety,
              isExpanded: true,
              icon: const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.primary),
              style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w500,
                  color: const Color(0xFF0F172A)),
              items: kSocieties.map((s) => DropdownMenuItem(
                value: s,
                child: Text(s.name, style: GoogleFonts.inter(fontSize: 14)),
              )).toList(),
              onChanged: (s) { if (s != null) setState(() => _selectedSociety = s); },
            ),
          ),
        ),

        const SizedBox(height: 20),

        // Mobile field
        _fieldLabel('Mobile Number'),
        const SizedBox(height: 6),
        TextFormField(
          controller: _phoneCtrl,
          keyboardType: TextInputType.phone,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w500),
          decoration: InputDecoration(
            hintText: '10-digit mobile number',
            hintStyle: GoogleFonts.inter(color: Colors.grey.shade400, fontSize: 14),
            prefixIcon: const Icon(Icons.phone_outlined, size: 20),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primary, width: 2),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: AppColors.error),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          ),
          validator: (v) {
            if (v == null || v.isEmpty) return 'Required';
            if (v.length < 10) return 'Enter a valid 10-digit mobile number';
            return null;
          },
        ),

        const SizedBox(height: 20),

        // DOB field
        _fieldLabel('Date of Birth'),
        const SizedBox(height: 6),
        TextFormField(
          controller: _dobCtrl,
          readOnly: true,
          onTap: _pickDate,
          style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w500),
          decoration: InputDecoration(
            hintText: 'Select your date of birth',
            hintStyle: GoogleFonts.inter(color: Colors.grey.shade400, fontSize: 14),
            prefixIcon: const Icon(Icons.cake_outlined, size: 20),
            suffixIcon: const Icon(Icons.calendar_month_outlined, size: 20),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primary, width: 2),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: AppColors.error),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          ),
          validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
        ),

        const SizedBox(height: 28),

        // Error banner
        if (_error != null) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFFECACA)),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 18),
                const SizedBox(width: 10),
                Flexible(
                  child: Text(_error!,
                    style: GoogleFonts.inter(color: AppColors.error, fontSize: 13)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Sign in button
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: _loading ? null : _login,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              textStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700),
            ),
            child: _loading
                ? const SizedBox(width: 22, height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                : const Text('Sign In'),
          ),
        ),

        const SizedBox(height: 24),

        // Help text
        Center(
          child: Text('Having trouble? Contact your branch.',
            style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade400)),
        ),
        const SizedBox(height: 8),
        Center(
          child: Text('Powered by Sicswave Fincore',
            style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade300,
              fontWeight: FontWeight.w500)),
        ),
      ],
    ),
  );

  Widget _fieldLabel(String text) => Text(
    text,
    style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF374151)),
  );
}
