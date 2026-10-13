import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../theme.dart';
import 'ledger_screen.dart';
import 'account_list_screen.dart';
import 'notices_screen.dart';
import 'profile_screen.dart';
import 'accounts_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  MemberProfile? _profile;
  bool _loading = true;
  String? _error;
  String _societyName = 'Member Portal';

  // ── Type config ───────────────────────────────────────────────────────────
  static const List<_TypeCfg> _typeCfg = [
    _TypeCfg('Saving',     'Saving Account',        Icons.savings_rounded,          [Color(0xFF1565C0), Color(0xFF1E88E5)]),
    _TypeCfg('FD',         'Fixed Deposit',          Icons.lock_clock_rounded,       [Color(0xFF00695C), Color(0xFF26A69A)]),
    _TypeCfg('RD',         'Recurring Deposit',      Icons.autorenew_rounded,        [Color(0xFFE65100), Color(0xFFFB8C00)]),
    _TypeCfg('ShareMoney', 'Share Capital',          Icons.pie_chart_rounded,        [Color(0xFF1B5E20), Color(0xFF43A047)]),
    _TypeCfg('Loan',       'Loan Outstanding',       Icons.account_balance_rounded,  [Color(0xFFC62828), Color(0xFFE53935)]),
  ];

  static const _TypeCfg _defaultCfg =
      _TypeCfg('', '', Icons.account_balance_wallet_rounded, [Color(0xFF607D8B), Color(0xFF90A4AE)]);

  static _TypeCfg _cfg(String type) =>
      _typeCfg.firstWhere((c) => c.type == type, orElse: () => _defaultCfg);

  // ── Init ──────────────────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final prefs = await SharedPreferences.getInstance();
    final name = prefs.getString('society_name') ?? 'Member Portal';
    if (mounted) setState(() => _societyName = name);
    await _loadProfile();
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

  String _fmt(double v) =>
      NumberFormat.currency(locale: 'en_IN', symbol: '₹ ', decimalDigits: 2).format(v.abs());

  // ── Build ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      body: SafeArea(
        top: false,
        child: _loading
            ? _buildLoading()
            : _error != null
                ? _buildError()
                : _buildContent(),
      ),
    );
  }

  Widget _buildLoading() => Column(
    children: [
      _buildTopBar(),
      const Expanded(child: Center(child: CircularProgressIndicator())),
    ],
  );

  Widget _buildError() => Column(
    children: [
      _buildTopBar(),
      Expanded(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.wifi_off_rounded, size: 60, color: Colors.grey.shade400),
                const SizedBox(height: 16),
                Text('Could not load your profile',
                  style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Text(_error!, textAlign: TextAlign.center,
                  style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade500)),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: _loadProfile,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Try Again'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    minimumSize: const Size(160, 46),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ],
  );

  Widget _buildContent() {
    final profile = _profile!;
    final grouped = <String, List<MemberAccount>>{};
    for (final acc in profile.accounts) {
      grouped.putIfAbsent(acc.accountType, () => []).add(acc);
    }

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // App bar + greeting (blue top)
          _buildHeader(profile),

          // White body on grey background
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildBalanceTiles(grouped),
                const SizedBox(height: 20),
                _buildQuickActions(),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopBar() => Container(
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        colors: [Color(0xFF1565C0), Color(0xFF1976D2)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
    ),
    child: Column(
      children: [
        SizedBox(height: MediaQuery.of(context).padding.top),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: [
              const Icon(Icons.menu_rounded, color: Colors.white, size: 22),
              const SizedBox(width: 12),
              Expanded(
                child: Text(_societyName,
                  style: GoogleFonts.inter(
                    color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700),
                  maxLines: 1, overflow: TextOverflow.ellipsis),
              ),
              IconButton(
                icon: const Icon(Icons.notifications_outlined, color: Colors.white, size: 22),
                onPressed: _openNotices,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
              ),
            ],
          ),
        ),
      ],
    ),
  );

  Widget _buildHeader(MemberProfile profile) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF1565C0), Color(0xFF1976D2)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        children: [
          // Status bar spacer
          SizedBox(height: MediaQuery.of(context).padding.top),

          // Top bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                const Icon(Icons.menu_rounded, color: Colors.white, size: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(_societyName,
                    style: GoogleFonts.inter(
                      color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                ),
                IconButton(
                  icon: const Icon(Icons.notifications_outlined, color: Colors.white, size: 22),
                  onPressed: _openNotices,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                ),
              ],
            ),
          ),

          // Greeting card
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: Colors.white.withOpacity(0.25),
                  child: Text(
                    profile.memberName.isNotEmpty ? profile.memberName[0].toUpperCase() : '?',
                    style: GoogleFonts.inter(
                      color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Namaste, ${_firstName(profile.memberName)} 🙏',
                        style: GoogleFonts.inter(
                          color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700),
                      ),
                      if (profile.membershipNo != null) ...[
                        const SizedBox(height: 3),
                        Text('Member No.: ${profile.membershipNo}',
                          style: GoogleFonts.inter(color: Colors.white70, fontSize: 12)),
                      ],
                      const SizedBox(height: 2),
                      Text(profile.branchName,
                        style: GoogleFonts.inter(color: Colors.white60, fontSize: 11),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),
        ],
      ),
    );
  }

  String _firstName(String name) => name.trim().split(' ').first;

  Widget _buildBalanceTiles(Map<String, List<MemberAccount>> grouped) {
    if (grouped.isEmpty) return const SizedBox();

    final nonLoanTypes = ['Saving', 'FD', 'RD', 'ShareMoney'];
    final nonLoanTiles = <Widget>[];

    for (final type in nonLoanTypes) {
      if (!grouped.containsKey(type)) continue;
      final accs = grouped[type]!;
      final total = accs.fold(0.0, (s, a) => s + a.balance);
      final cfg = _cfg(type);
      nonLoanTiles.add(_BalanceTile(
        label: cfg.label,
        icon: cfg.icon,
        colors: cfg.colors,
        amount: _fmt(total),
        onTap: () => _navigate(type, accs),
      ));
    }

    final rows = <Widget>[];
    rows.add(Text('Account Summary',
      style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF1A202C))));
    rows.add(const SizedBox(height: 12));

    for (int i = 0; i < nonLoanTiles.length; i += 2) {
      rows.add(Row(
        children: [
          Expanded(child: nonLoanTiles[i]),
          const SizedBox(width: 12),
          Expanded(
            child: i + 1 < nonLoanTiles.length ? nonLoanTiles[i + 1] : const SizedBox(),
          ),
        ],
      ));
      if (i + 2 < nonLoanTiles.length || grouped.containsKey('Loan')) {
        rows.add(const SizedBox(height: 12));
      }
    }

    // Loan — full width
    if (grouped.containsKey('Loan')) {
      final loans = grouped['Loan']!;
      final total = loans.fold(0.0, (s, a) => s + a.balance);
      final cfg = _cfg('Loan');
      rows.add(_BalanceTile(
        label: cfg.label,
        icon: cfg.icon,
        colors: cfg.colors,
        amount: _fmt(total),
        fullWidth: true,
        onTap: () => _navigate('Loan', loans),
      ));
    }

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: rows);
  }

  void _navigate(String type, List<MemberAccount> accs) {
    final cfg = _cfg(type);
    if (accs.length == 1) {
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => LedgerScreen(account: accs.first, color: cfg.colors[0], icon: cfg.icon),
      ));
    } else {
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => AccountListScreen(
          label: cfg.label, accounts: accs, color: cfg.colors[0], icon: cfg.icon),
      ));
    }
  }

  Widget _buildQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Quick Actions',
          style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF1A202C))),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0, 2)),
            ],
          ),
          child: Row(
            children: [
              _QuickBtn(
                icon: Icons.receipt_long_rounded,
                label: 'Mini\nStatement',
                color: const Color(0xFF1565C0),
                onTap: () => Navigator.push(context, MaterialPageRoute(
                  builder: (_) => const AccountsScreen())),
              ),
              _QuickBtn(
                icon: Icons.download_rounded,
                label: 'Download\nStatement',
                color: const Color(0xFF00695C),
                onTap: () => Navigator.push(context, MaterialPageRoute(
                  builder: (_) => const AccountsScreen())),
              ),
              _QuickBtn(
                icon: Icons.person_rounded,
                label: 'My\nProfile',
                color: const Color(0xFF6D28D9),
                onTap: () => Navigator.push(context, MaterialPageRoute(
                  builder: (_) => const ProfileScreen())),
              ),
              _QuickBtn(
                icon: Icons.notifications_rounded,
                label: 'Notices',
                color: const Color(0xFFE65100),
                onTap: _openNotices,
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _openNotices() => Navigator.push(
    context,
    MaterialPageRoute(builder: (_) => const NoticesScreen()),
  );
}

// ── Shared config ─────────────────────────────────────────────────────────────
class _TypeCfg {
  final String type;
  final String label;
  final IconData icon;
  final List<Color> colors;

  const _TypeCfg(this.type, this.label, this.icon, this.colors);
}

// ── Balance tile ──────────────────────────────────────────────────────────────
class _BalanceTile extends StatelessWidget {
  final String label;
  final IconData icon;
  final List<Color> colors;
  final String amount;
  final bool fullWidth;
  final VoidCallback onTap;

  const _BalanceTile({
    required this.label,
    required this.icon,
    required this.colors,
    required this.amount,
    required this.onTap,
    this.fullWidth = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: fullWidth ? 76 : 110,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: colors,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: colors.first.withOpacity(0.3),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: fullWidth
            ? Row(
                children: [
                  Icon(icon, color: Colors.white.withOpacity(0.9), size: 26),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(label,
                          style: GoogleFonts.inter(
                            color: Colors.white.withOpacity(0.85), fontSize: 12, fontWeight: FontWeight.w500)),
                        const SizedBox(height: 4),
                        Text(amount,
                          style: GoogleFonts.inter(
                            color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                          maxLines: 1, overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  ),
                  Icon(Icons.arrow_forward_ios_rounded,
                    color: Colors.white.withOpacity(0.5), size: 14),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(icon, color: Colors.white.withOpacity(0.9), size: 24),
                  const Spacer(),
                  Text(label,
                    style: GoogleFonts.inter(
                      color: Colors.white.withOpacity(0.85), fontSize: 11, fontWeight: FontWeight.w500),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 3),
                  Text(amount,
                    style: GoogleFonts.inter(
                      color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              ),
      ),
    );
  }
}

// ── Quick action button ───────────────────────────────────────────────────────
class _QuickBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickBtn({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 48, height: 48,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(height: 8),
              Text(label,
                style: GoogleFonts.inter(
                  fontSize: 10, fontWeight: FontWeight.w600,
                  color: const Color(0xFF374151), height: 1.3),
                textAlign: TextAlign.center,
                maxLines: 2,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
