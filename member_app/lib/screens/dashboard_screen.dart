import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../theme.dart';
import 'ledger_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  MemberProfile? _profile;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
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
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sign Out', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();
      if (mounted) Navigator.pushReplacementNamed(context, '/login');
    }
  }

  String _formatAmount(double amount) =>
      NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 2).format(amount.abs());

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  String _firstName(String name) => name.trim().split(' ').first;

  // ── Section metadata ──────────────────────────────────────────────────────
  static const _sectionOrder = ['Saving', 'FD', 'RD', 'ShareMoney', 'Loan'];

  String _sectionLabel(String type) => switch (type) {
    'Saving'     => 'Savings Accounts',
    'FD'         => 'Fixed Deposits',
    'RD'         => 'Recurring Deposits',
    'ShareMoney' => 'Share Capital',
    'Loan'       => 'Loan Accounts',
    _            => type,
  };

  String _balanceLabel(String type) => switch (type) {
    'Loan' => 'Outstanding',
    'FD'   => 'Current Value',
    'RD'   => 'Accumulated',
    _      => 'Balance',
  };

  IconData _sectionIcon(String type) => switch (type) {
    'Saving'     => Icons.savings_rounded,
    'FD'         => Icons.lock_clock_rounded,
    'RD'         => Icons.autorenew_rounded,
    'ShareMoney' => Icons.pie_chart_rounded,
    'Loan'       => Icons.trending_down_rounded,
    _            => Icons.account_balance_wallet_rounded,
  };

  Color _sectionColor(String type) => switch (type) {
    'Saving'     => AppColors.saving,
    'FD'         => AppColors.fd,
    'RD'         => AppColors.rd,
    'ShareMoney' => AppColors.shareMoney,
    'Loan'       => AppColors.loan,
    _            => Colors.blueGrey,
  };

  // ── Build ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildError()
              : _buildContent(),
    );
  }

  Widget _buildError() => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.wifi_off_rounded, size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text('Could not load your profile',
            style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.grey.shade700)),
          const SizedBox(height: 8),
          Text(_error!, textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade500)),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _loadProfile,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Try Again'),
          ),
        ],
      ),
    ),
  );

  Widget _buildContent() {
    final profile = _profile!;

    final totalSavings = profile.accounts
        .where((a) => a.accountType != 'Loan')
        .fold(0.0, (s, a) => s + a.balance);
    final totalLoan = profile.accounts
        .where((a) => a.accountType == 'Loan')
        .fold(0.0, (s, a) => s + a.balance);

    // Group by type in display order
    final grouped = <String, List<MemberAccount>>{};
    for (final type in _sectionOrder) {
      final list = profile.accounts.where((a) => a.accountType == type).toList();
      if (list.isNotEmpty) grouped[type] = list;
    }

    final slivers = <Widget>[
      // ── Gradient header ─────────────────────────────────────────────────
      // NOTE: Pills are NOT in FlexibleSpaceBar — FlexibleSpaceBar's Stack
      // passes loose constraints that break Row/Expanded layouts.
      // Only Text widgets live in the background; pills live below as a card.
      SliverAppBar(
        expandedHeight: 160,
        pinned: true,
        automaticallyImplyLeading: false,
        backgroundColor: const Color(0xFF0F3460),
        elevation: 0,
        title: Row(
          children: [
            Container(
              width: 32, height: 32,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(9),
              ),
              child: Center(
                child: Text(
                  _firstName(profile.memberName)[0].toUpperCase(),
                  style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Flexible(
              child: Text(
                '${_greeting()}, ${_firstName(profile.memberName)}!',
                style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Colors.white70),
            tooltip: 'Sign Out',
            onPressed: _logout,
          ),
        ],
        flexibleSpace: FlexibleSpaceBar(
          background: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF0F3460), Color(0xFF1A56DB), Color(0xFF7C3AED)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            alignment: Alignment.bottomLeft,
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
            // Only Text here — no Row/Expanded (FlexibleSpaceBar gives loose constraints)
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Total Savings',
                  style: GoogleFonts.inter(color: Colors.white.withOpacity(0.65),
                    fontSize: 12, fontWeight: FontWeight.w500)),
                const SizedBox(height: 4),
                Text(
                  _formatAmount(totalSavings),
                  style: GoogleFonts.inter(color: Colors.white, fontSize: 34,
                    fontWeight: FontWeight.w800, letterSpacing: -1),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ),

      // ── Summary pills card (overlaps header by 24px) ──────────────────
      SliverToBoxAdapter(
        child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _statTile(
                      Icons.account_balance_wallet_rounded,
                      '${profile.accounts.where((a) => a.accountType != 'Loan').length}',
                      'Active Accounts',
                      AppColors.primary,
                    ),
                  ),
                  Container(width: 1, height: 40, color: Colors.grey.shade100),
                  Expanded(
                    child: totalLoan > 0
                      ? _statTile(Icons.trending_down_rounded, _formatAmount(totalLoan),
                          'Loan Outstanding', AppColors.error)
                      : _statTile(Icons.check_circle_rounded, 'No Dues',
                          'Loan Status', Colors.green.shade600),
                  ),
                ],
              ),
            ),
          ),
      ),

      // ── Account sections ───────────────────────────────────────────────
      for (final type in _sectionOrder)
        if (grouped.containsKey(type)) ...[
          SliverPadding(
            padding: EdgeInsets.fromLTRB(16, type == _sectionOrder.first ? 24 : 8, 16, 0),
            sliver: SliverToBoxAdapter(
              child: _SectionHeader(
                icon: _sectionIcon(type),
                color: _sectionColor(type),
                label: _sectionLabel(type),
                count: grouped[type]!.length,
                total: grouped[type]!.fold(0.0, (s, a) => s + a.balance),
                formatAmount: _formatAmount,
                isLoan: type == 'Loan',
              ),
            ),
          ),
          SliverPadding(
            padding: EdgeInsets.fromLTRB(16, 10, 16, 0),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (ctx, i) {
                  final acc = grouped[type]![i];
                  return _AccountCard(
                    account: acc,
                    color: _sectionColor(type),
                    icon: _sectionIcon(type),
                    balanceLabel: _balanceLabel(type),
                    formatAmount: _formatAmount,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => LedgerScreen(
                          account: acc,
                          color: _sectionColor(type),
                          icon: _sectionIcon(type),
                        ),
                      ),
                    ),
                  );
                },
                childCount: grouped[type]!.length,
              ),
            ),
          ),
        ],

      const SliverPadding(padding: EdgeInsets.only(bottom: 32)),
    ];

    return CustomScrollView(slivers: slivers);
  }

  Widget _statTile(IconData icon, String value, String label, Color color) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 8),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(height: 6),
        Text(value,
          style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700,
            color: const Color(0xFF0F172A)),
          maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center),
        Text(label,
          style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade500),
          maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center),
      ],
    ),
  );
}

// ── Section header card ─────────────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final int count;
  final double total;
  final String Function(double) formatAmount;
  final bool isLoan;

  const _SectionHeader({
    required this.icon,
    required this.color,
    required this.label,
    required this.count,
    required this.total,
    required this.formatAmount,
    required this.isLoan,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.18)),
      ),
      child: Row(
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(11),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700,
                    color: const Color(0xFF0F172A)),
                  maxLines: 1, overflow: TextOverflow.ellipsis),
                Text('$count account${count == 1 ? '' : 's'}',
                  style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade500)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(formatAmount(total),
                style: GoogleFonts.inter(
                  fontSize: 14, fontWeight: FontWeight.w700,
                  color: isLoan ? AppColors.error : color,
                ),
                maxLines: 1, overflow: TextOverflow.ellipsis),
              Text(isLoan ? 'Total Outstanding' : 'Total',
                style: GoogleFonts.inter(fontSize: 10, color: Colors.grey.shade500)),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Account card ─────────────────────────────────────────────────────────────
class _AccountCard extends StatelessWidget {
  final MemberAccount account;
  final Color color;
  final IconData icon;
  final String balanceLabel;
  final String Function(double) formatAmount;
  final VoidCallback onTap;

  const _AccountCard({
    required this.account,
    required this.color,
    required this.icon,
    required this.balanceLabel,
    required this.formatAmount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isLoan = account.accountType == 'Loan';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                // Left color stripe
                Container(
                  width: 4, height: 42,
                  decoration: BoxDecoration(
                    color: color.withOpacity(account.isClosed ? 0.3 : 0.7),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(width: 14),

                // Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Account name + status badge
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              account.accountName,
                              style: GoogleFonts.inter(
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                                color: account.isClosed
                                    ? Colors.grey.shade400
                                    : const Color(0xFF0F172A),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (account.isClosed) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text('Closed',
                                style: GoogleFonts.inter(fontSize: 9, color: Colors.grey.shade500,
                                  fontWeight: FontWeight.w600)),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      // Account identifier
                      Text(
                        'A/C: ${account.accountIdentifier}',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: Colors.grey.shade400,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),

                // Balance block
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      formatAmount(account.balance),
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: isLoan && account.balance > 0
                            ? AppColors.error
                            : const Color(0xFF0F172A),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(balanceLabel,
                      style: GoogleFonts.inter(fontSize: 10, color: Colors.grey.shade400)),
                  ],
                ),
                const SizedBox(width: 4),
                Icon(Icons.chevron_right_rounded, color: Colors.grey.shade300, size: 18),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
