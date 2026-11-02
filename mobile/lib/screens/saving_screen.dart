import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';
import '../models.dart';
import '../services/api_service.dart';
import '../widgets.dart';
import 'receipt_screen.dart';

class SavingScreen extends StatefulWidget {
  final AgentInfo agent;
  const SavingScreen({super.key, required this.agent});

  @override
  State<SavingScreen> createState() => _SavingScreenState();
}

class _SavingScreenState extends State<SavingScreen> {
  List<SavingAccount> _accounts = [];
  final Map<int, TextEditingController> _ctrlMap = {};
  bool _isDeposit = true;
  String _search = '';
  bool _loading = true;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _loadAccounts();
  }

  @override
  void dispose() {
    for (final c in _ctrlMap.values) { c.dispose(); }
    super.dispose();
  }

  Future<void> _loadAccounts() async {
    setState(() { _loading = true; _loadError = null; });
    try {
      final dtos = await agentApi.getSavingAccounts();
      final accounts = dtos.map(SavingAccount.fromDto).toList();
      final map = <int, TextEditingController>{};
      for (final a in accounts) { map[a.accountId] = TextEditingController(); }
      if (mounted) setState(() { _accounts = accounts; _ctrlMap.addAll(map); _loading = false; });
    } on ApiException catch (e) {
      if (mounted) setState(() { _loadError = e.message; _loading = false; });
    }
  }

  List<SavingAccount> get _filtered => _accounts
      .where((a) => _search.isEmpty || a.accountName.toLowerCase().contains(_search.toLowerCase()) || a.accountNumber.contains(_search))
      .toList();

  int get _doneCount => _accounts.where((a) => a.transactionAmount != null).length;

  void _resetAmounts() {
    for (final acc in _accounts) { acc.transactionAmount = null; _ctrlMap[acc.accountId]?.clear(); }
  }

  Future<void> _transact(SavingAccount acc) async {
    final val = double.tryParse(_ctrlMap[acc.accountId]?.text ?? '');
    if (val == null || val <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Enter a valid amount', style: GoogleFonts.dmSans()), backgroundColor: AppColors.danger));
      return;
    }
    if (!_isDeposit && val > acc.balance) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Amount exceeds balance (₹${acc.balance.toStringAsFixed(0)})', style: GoogleFonts.dmSans()),
        backgroundColor: AppColors.danger));
      return;
    }
    try {
      final result = await agentApi.postCollection(
        accountId: acc.accountId,
        accType: 'Saving',
        amount: val,
        notes: _isDeposit ? 'Deposit' : 'Withdrawal',
      );
      if (!mounted) return;
      setState(() => acc.transactionAmount = val);
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => ReceiptScreen(receipt: CollectionReceipt(
          collectionId: result.collectionId,
          accountNumber: acc.accountNumber, accountName: acc.accountName,
          accountType: _isDeposit ? 'Saving Deposit' : 'Saving Withdrawal',
          agentName: widget.agent.agentName, mobileNumber: acc.mobileNumber,
          amount: val, collectionDate: DateTime.now(),
        )),
      ));
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message, style: GoogleFonts.dmSans()), backgroundColor: AppColors.danger));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Column(
        children: [
          ScreenHeader(
            title: 'Saving Collection',
            subtitle: _isDeposit ? 'Deposit Mode' : 'Withdrawal Mode',
            gradient: AppColors.savingGradient, icon: Icons.savings_rounded,
            collected: _doneCount, total: _accounts.length,
          ),

          // Mode toggle
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: AppColors.card(radius: 14),
              child: Row(children: [
                _ModeTab(label: 'Deposit',   icon: Icons.arrow_downward_rounded,
                  active: _isDeposit, color: AppColors.emerald,
                  onTap: () => setState(() { _isDeposit = true;  _resetAmounts(); })),
                const SizedBox(width: 4),
                _ModeTab(label: 'Withdrawal', icon: Icons.arrow_upward_rounded,
                  active: !_isDeposit, color: AppColors.danger,
                  onTap: () => setState(() { _isDeposit = false; _resetAmounts(); })),
              ]),
            ),
          ),

          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: TextField(
              onChanged: (v) => setState(() => _search = v),
              style: GoogleFonts.dmSans(fontSize: 14, color: AppColors.textPrimary),
              decoration: const InputDecoration(
                hintText: 'Search by name or account no…',
                prefixIcon: Icon(Icons.search_rounded, size: 19, color: AppColors.textSecondary),
              ),
            ),
          ),

          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppColors.emerald))
                : _loadError != null
                    ? _ErrorView(message: _loadError!, onRetry: _loadAccounts)
                    : _filtered.isEmpty
                        ? Center(child: Text('No accounts found', style: GoogleFonts.dmSans(color: AppColors.textMuted)))
                        : ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 10, 16, 40),
                            itemCount: _filtered.length,
                            itemBuilder: (_, i) {
                              final acc = _filtered[i];
                              return _SavingCard(
                                account: acc,
                                controller: _ctrlMap[acc.accountId]!,
                                isDeposit: _isDeposit,
                                onTransact: () => _transact(acc),
                              ).animate().fadeIn(delay: (i * 40).ms).slideY(begin: 0.1);
                            },
                          ),
          ),
        ],
      ),
    );
  }
}

class _SavingCard extends StatelessWidget {
  final SavingAccount account;
  final TextEditingController controller;
  final bool isDeposit;
  final VoidCallback onTransact;
  const _SavingCard({required this.account, required this.controller, required this.isDeposit, required this.onTransact});

  @override
  Widget build(BuildContext context) {
    final done        = account.transactionAmount != null;
    final actionColor = isDeposit ? AppColors.emerald : AppColors.danger;
    final actionGrad  = isDeposit ? AppColors.savingGradient
        : const LinearGradient(colors: [Color(0xFFDC2626), Color(0xFFEF4444)], begin: Alignment.topLeft, end: Alignment.bottomRight);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: AppColors.card(radius: 16, borderColor: done ? actionColor.withValues(alpha: 0.4) : null),
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
          child: Row(children: [
            AccountAvatar(name: account.accountName, color: AppColors.savingColor),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Flexible(child: Text(account.accountName,
                  style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                  overflow: TextOverflow.ellipsis)),
                if (done) ...[const SizedBox(width: 6), Icon(Icons.check_circle_rounded, color: actionColor, size: 16)],
              ]),
              Text('S/O ${account.relativeName}', style: GoogleFonts.dmSans(fontSize: 11, color: AppColors.textSecondary)),
            ])),
            Text(account.accountNumber, style: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.emeraldDark)),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Row(children: [
            InfoChip(account.productName, AppColors.emeraldDark),
            const SizedBox(width: 8),
            InfoChip('Bal ₹${_f(account.balance)}', isDeposit ? AppColors.textSecondary : AppColors.danger),
          ]),
        ),
        if (!done) ...[
          Divider(height: 1, color: AppColors.border),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            child: Row(children: [
              Expanded(child: TextField(
                controller: controller,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                style: GoogleFonts.dmSans(color: AppColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w600),
                decoration: InputDecoration(
                  labelText: isDeposit ? 'Deposit Amount (₹)' : 'Withdrawal Amount (₹)',
                  prefixText: '₹ ',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                ),
              )),
              const SizedBox(width: 10),
              GestureDetector(
                onTap: onTransact,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                  decoration: BoxDecoration(gradient: actionGrad, borderRadius: BorderRadius.circular(12)),
                  child: Text(isDeposit ? 'Deposit' : 'Withdraw',
                    style: GoogleFonts.dmSans(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
                ),
              ),
            ]),
          ),
        ] else ...[
          Container(
            margin: const EdgeInsets.fromLTRB(14, 0, 14, 14),
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: actionColor.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12),
              border: Border.all(color: actionColor.withValues(alpha: 0.3)),
            ),
            child: Center(child: Text(
              '✓  ${isDeposit ? "Deposited" : "Withdrawn"} ₹${account.transactionAmount!.toStringAsFixed(0)}',
              style: GoogleFonts.dmSans(color: actionColor, fontWeight: FontWeight.w600, fontSize: 13))),
          ),
        ],
      ]),
    );
  }

  String _f(double v) => v >= 1000 ? '${(v / 1000).toStringAsFixed(1)}K' : v.toStringAsFixed(0);
}

class _ModeTab extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool active;
  final Color color;
  final VoidCallback onTap;
  const _ModeTab({required this.label, required this.icon, required this.active, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) => Expanded(
    child: GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: active ? color.withValues(alpha: 0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: active ? color.withValues(alpha: 0.4) : Colors.transparent),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, color: active ? color : AppColors.textMuted, size: 15),
          const SizedBox(width: 6),
          Text(label, style: GoogleFonts.dmSans(
            fontSize: 13, fontWeight: active ? FontWeight.w600 : FontWeight.w400,
            color: active ? color : AppColors.textMuted)),
        ]),
      ),
    ),
  );
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(padding: const EdgeInsets.all(32),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.wifi_off_rounded, size: 48, color: AppColors.textMuted),
        const SizedBox(height: 12),
        Text(message, textAlign: TextAlign.center, style: GoogleFonts.dmSans(color: AppColors.textSecondary)),
        const SizedBox(height: 20),
        ElevatedButton.icon(
          onPressed: onRetry,
          icon: const Icon(Icons.refresh_rounded),
          label: const Text('Retry'),
          style: ElevatedButton.styleFrom(minimumSize: const Size(140, 44)),
        ),
      ]),
    ),
  );
}
