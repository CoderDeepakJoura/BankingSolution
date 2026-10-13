import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../theme.dart';
import 'ledger_screen.dart';
import 'account_list_screen.dart';

class AccountsScreen extends StatefulWidget {
  const AccountsScreen({super.key});

  @override
  State<AccountsScreen> createState() => _AccountsScreenState();
}

class _AccountsScreenState extends State<AccountsScreen> {
  MemberProfile? _profile;
  bool _loading = true;
  String? _error;

  static const List<_AccTypeCfg> _typeOrder = [
    _AccTypeCfg('Saving',     'Saving Account',     'View Balance & Ledger',    Icons.savings_rounded,          Color(0xFF1565C0)),
    _AccTypeCfg('FD',         'Fixed Deposit (FD)', 'View FD Details & Ledger', Icons.lock_clock_rounded,       Color(0xFF00695C)),
    _AccTypeCfg('RD',         'Recurring Deposit (RD)', 'View RD Details & Ledger', Icons.autorenew_rounded,   Color(0xFFE65100)),
    _AccTypeCfg('ShareMoney', 'Share Capital',       'View Share Details',      Icons.pie_chart_rounded,        Color(0xFF1B5E20)),
    _AccTypeCfg('Loan',       'Loan Account',        'View Loan Details & Ledger', Icons.account_balance_rounded, Color(0xFFC62828)),
  ];

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
        setState(() => _error = res['message'] as String? ?? 'Failed to load.');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _fmt(double v) =>
      NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 2).format(v.abs());

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
        title: Text('My Accounts',
          style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
        elevation: 0,
      ),
      body: SafeArea(
        top: false,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? _buildError()
                : _buildList(),
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

  Widget _buildList() {
    final profile = _profile!;
    final grouped = <String, List<MemberAccount>>{};
    for (final acc in profile.accounts) {
      grouped.putIfAbsent(acc.accountType, () => []).add(acc);
    }

    final visible = _typeOrder.where((t) => grouped.containsKey(t.type)).toList();

    if (visible.isEmpty) {
      return Center(
        child: Text('No accounts found.',
          style: GoogleFonts.inter(color: Colors.grey.shade500, fontSize: 14)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: visible.length,
      itemBuilder: (ctx, i) {
        final cfg = visible[i];
        final accs = grouped[cfg.type]!;
        final total = accs.fold(0.0, (s, a) => s + a.balance);
        final isLoan = cfg.type == 'Loan';

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6, offset: const Offset(0, 2)),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(14),
            child: InkWell(
              onTap: () => _open(accs, cfg),
              borderRadius: BorderRadius.circular(14),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  children: [
                    Container(
                      width: 48, height: 48,
                      decoration: BoxDecoration(
                        color: cfg.color.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(13),
                      ),
                      child: Icon(cfg.icon, color: cfg.color, size: 24),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(cfg.label,
                            style: GoogleFonts.inter(
                              fontSize: 14, fontWeight: FontWeight.w700,
                              color: const Color(0xFF1A202C))),
                          const SizedBox(height: 3),
                          Text(cfg.subtitle,
                            style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade500)),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(_fmt(total),
                          style: GoogleFonts.inter(
                            fontSize: 13, fontWeight: FontWeight.w700,
                            color: isLoan && total > 0 ? AppColors.error : cfg.color)),
                        const SizedBox(height: 2),
                        Text('${accs.length} account${accs.length > 1 ? 's' : ''}',
                          style: GoogleFonts.inter(fontSize: 10, color: Colors.grey.shade400)),
                      ],
                    ),
                    const SizedBox(width: 4),
                    Icon(Icons.chevron_right_rounded, color: Colors.grey.shade300, size: 20),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  void _open(List<MemberAccount> accs, _AccTypeCfg cfg) {
    if (accs.length == 1) {
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => LedgerScreen(account: accs.first, color: cfg.color, icon: cfg.icon),
      ));
    } else {
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => AccountListScreen(
          label: cfg.label, accounts: accs, color: cfg.color, icon: cfg.icon),
      ));
    }
  }
}

class _AccTypeCfg {
  final String type;
  final String label;
  final String subtitle;
  final IconData icon;
  final Color color;

  const _AccTypeCfg(this.type, this.label, this.subtitle, this.icon, this.color);
}
