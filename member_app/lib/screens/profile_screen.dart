import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../theme.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  MemberProfile? _profile;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await ApiService.getProfile();
      if (res['success'] == true) {
        setState(() => _profile = MemberProfile.fromJson(res['data'] as Map<String, dynamic>));
      } else {
        setState(() => _error = res['message'] as String? ?? 'Failed to load profile.');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Sign Out', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: Text('Are you sure you want to sign out?',
          style: GoogleFonts.inter(fontSize: 14)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: GoogleFonts.inter()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Sign Out',
              style: GoogleFonts.inter(color: AppColors.error, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
    if (ok == true) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();
      if (mounted) Navigator.pushNamedAndRemoveUntil(context, '/login', (_) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1565C0),
        foregroundColor: Colors.white,
        automaticallyImplyLeading: Navigator.canPop(context),
        leading: Navigator.canPop(context)
            ? IconButton(
                icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
                onPressed: () => Navigator.pop(context),
              )
            : null,
        title: Text('My Profile',
          style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
        elevation: 0,
      ),
      body: SafeArea(
        top: false,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? _buildError()
                : _buildContent(),
      ),
    );
  }

  Widget _buildError() => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.wifi_off_rounded, size: 56, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text(_error!, textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600)),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: _load,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Retry'),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
          ),
        ],
      ),
    ),
  );

  Widget _buildContent() {
    final p = _profile!;
    final initials = p.memberName.trim().split(' ')
        .where((w) => w.isNotEmpty)
        .take(2)
        .map((w) => w[0].toUpperCase())
        .join();

    return SingleChildScrollView(
      child: Column(
        children: [
          // Avatar header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF1565C0), Color(0xFF1976D2)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 40,
                  backgroundColor: Colors.white.withOpacity(0.2),
                  child: Text(initials,
                    style: GoogleFonts.inter(
                      color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700)),
                ),
                const SizedBox(height: 12),
                Text(p.memberName,
                  style: GoogleFonts.inter(
                    color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
                  textAlign: TextAlign.center),
                if (p.membershipNo != null) ...[
                  const SizedBox(height: 4),
                  Text('Member No.: ${p.membershipNo}',
                    style: GoogleFonts.inter(color: Colors.white70, fontSize: 13)),
                ],
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.25),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text('Active Member',
                    style: GoogleFonts.inter(
                      color: Colors.greenAccent, fontSize: 11, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
          ),

          // Info cards
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _infoCard('Personal Information', [
                  if (p.phoneNo != null)
                    _infoRow(Icons.phone_rounded, 'Mobile No.', p.phoneNo!),
                  if (p.email != null)
                    _infoRow(Icons.email_rounded, 'Email', p.email!),
                  _infoRow(Icons.cake_rounded, 'Date of Birth',
                    DateFormat('dd MMM yyyy').format(p.dob)),
                  _infoRow(Icons.account_balance_rounded, 'Branch', p.branchName),
                ]),

                const SizedBox(height: 12),

                _actionCard([
                  _actionRow(
                    Icons.help_outline_rounded,
                    Colors.blue.shade700,
                    'Help & Support',
                    'Contact your branch for assistance',
                    () {},
                  ),
                  const Divider(height: 1, indent: 60),
                  _actionRow(
                    Icons.logout_rounded,
                    AppColors.error,
                    'Sign Out',
                    'Sign out of your account',
                    _logout,
                  ),
                ]),

                const SizedBox(height: 16),
                Text('Powered by Sicswave Fincore',
                  style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade400)),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoCard(String title, List<Widget> rows) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      boxShadow: [
        BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6, offset: const Offset(0, 2)),
      ],
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title,
          style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700,
            color: const Color(0xFF374151))),
        const SizedBox(height: 12),
        ...rows,
      ],
    ),
  );

  Widget _infoRow(IconData icon, String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Row(
      children: [
        Icon(icon, size: 18, color: const Color(0xFF1565C0)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade500)),
              Text(value,
                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600,
                  color: const Color(0xFF1A202C))),
            ],
          ),
        ),
      ],
    ),
  );

  Widget _actionCard(List<Widget> items) => Container(
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      boxShadow: [
        BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6, offset: const Offset(0, 2)),
      ],
    ),
    child: Column(children: items),
  );

  Widget _actionRow(IconData icon, Color color, String title, String subtitle, VoidCallback onTap) =>
      Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Container(
                  width: 38, height: 38,
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: color, size: 19),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                        style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600,
                          color: const Color(0xFF1A202C))),
                      Text(subtitle,
                        style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade500)),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right_rounded, color: Colors.grey.shade300, size: 20),
              ],
            ),
          ),
        ),
      );
}
