import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';
import '../models.dart';
import '../services/api_service.dart';
import '../widgets.dart';
import 'receipt_screen.dart';

class LoanScreen extends StatefulWidget {
  final AgentInfo agent;
  const LoanScreen({super.key, required this.agent});

  @override
  State<LoanScreen> createState() => _LoanScreenState();
}

class _LoanScreenState extends State<LoanScreen> {
  List<LoanAccount> _accounts = [];
  final Map<int, TextEditingController> _ctrlMap = {};
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
      final dtos = await agentApi.getLoanAccounts();
      final accounts = dtos.map(LoanAccount.fromDto).toList();
      final map = <int, TextEditingController>{};
      for (final a in accounts) { map[a.accountId] = TextEditingController(); }
      if (mounted) setState(() { _accounts = accounts; _ctrlMap.addAll(map); _loading = false; });
    } on ApiException catch (e) {
      if (mounted) setState(() { _loadError = e.message; _loading = false; });
    }
  }

  List<LoanAccount> get _filtered => _accounts
      .where((a) => _search.isEmpty || a.accountName.toLowerCase().contains(_search.toLowerCase()) || a.accountNumber.contains(_search))
      .toList();

  int get _collectedCount => _accounts.where((a) => a.recoveryAmount != null).length;

  Future<void> _collect(LoanAccount acc) async {
    final val = double.tryParse(_ctrlMap[acc.accountId]?.text ?? '');
    if (val == null || val <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Enter a valid amount', style: GoogleFonts.dmSans()), backgroundColor: AppColors.danger));
      return;
    }
    try {
      final result = await agentApi.postCollection(
        accountId: acc.accountId, accType: 'Loan', amount: val,
      );
      if (!mounted) return;
      setState(() => acc.recoveryAmount = val);
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => ReceiptScreen(receipt: CollectionReceipt(
          collectionId: result.collectionId,
          accountNumber: acc.accountNumber, accountName: acc.accountName,
          accountType: 'Loan Recovery — ${acc.productName}',
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
            title: 'Loan Recovery', subtitle: 'EMI & Interest Collection',
            gradient: AppColors.loanGradient, icon: Icons.account_balance_wallet_rounded,
            collected: _collectedCount, total: _accounts.length,
          ),

          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
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
                ? const Center(child: CircularProgressIndicator(color: AppColors.loanColor))
                : _loadError != null
                    ? _ErrorView(message: _loadError!, onRetry: _loadAccounts)
                    : _filtered.isEmpty
                        ? Center(child: Text('No accounts found', style: GoogleFonts.dmSans(color: AppColors.textMuted)))
                        : ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 10, 16, 40),
                            itemCount: _filtered.length,
                            itemBuilder: (_, i) {
                              final acc = _filtered[i];
                              return _LoanCard(
                                account: acc,
                                controller: _ctrlMap[acc.accountId]!,
                                onCollect: () => _collect(acc),
                              ).animate().fadeIn(delay: (i * 40).ms).slideY(begin: 0.1);
                            },
                          ),
          ),
        ],
      ),
    );
  }
}

class _LoanCard extends StatelessWidget {
  final LoanAccount account;
  final TextEditingController controller;
  final VoidCallback onCollect;
  const _LoanCard({required this.account, required this.controller, required this.onCollect});

  @override
  Widget build(BuildContext context) {
    final done    = account.recoveryAmount != null;
    final isStand = account.loanType == LoanType.stand;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: AppColors.card(radius: 16, borderColor: done ? AppColors.success.withValues(alpha: 0.4) : null),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
          child: Row(children: [
            AccountAvatar(name: account.accountName, color: AppColors.loanColor),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Flexible(child: Text(account.accountName,
                  style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                  overflow: TextOverflow.ellipsis)),
                if (done) ...[const SizedBox(width: 6), const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 16)],
              ]),
              Text('S/O ${account.relativeName}', style: GoogleFonts.dmSans(fontSize: 11, color: AppColors.textSecondary)),
            ])),
            Text(account.accountNumber, style: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.loanColor)),
          ]),
        ),

        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
          child: Row(children: [
            InfoChip(account.productName, AppColors.loanColor),
            const SizedBox(width: 8),
            InfoChip(isStand ? 'Stand Loan' : 'Add-in-Balance',
              isStand ? AppColors.navy : AppColors.textSecondary),
          ]),
        ),

        // Balance breakdown
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.surfaceAlt, borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(children: [
              _BalTile('Outstanding', '₹${_f(account.outstandingBalance)}', AppColors.textSecondary),
              _vDiv(),
              _BalTile('Principal Due', '₹${_f(account.principalDue)}', AppColors.warning),
              if (isStand) ...[_vDiv(), _BalTile('Interest Due', '₹${_f(account.interestDue)}', AppColors.danger)],
            ]),
          ),
        ),

        if (!done) ...[
          Divider(height: 1, color: AppColors.border),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (isStand)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    'Suggested: ₹${(account.principalDue + account.interestDue).toStringAsFixed(0)} (Principal + Interest)',
                    style: GoogleFonts.dmSans(fontSize: 11, color: AppColors.textSecondary)),
                ),
              Row(children: [
                Expanded(child: TextField(
                  controller: controller,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  style: GoogleFonts.dmSans(color: AppColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w600),
                  decoration: const InputDecoration(
                    labelText: 'Recovery Amount (₹)',
                    prefixText: '₹ ',
                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                )),
                const SizedBox(width: 10),
                GestureDetector(
                  onTap: onCollect,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    decoration: BoxDecoration(gradient: AppColors.loanGradient, borderRadius: BorderRadius.circular(12)),
                    child: Text('Collect', style: GoogleFonts.dmSans(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
                  ),
                ),
              ]),
            ]),
          ),
        ] else ...[
          Container(
            margin: const EdgeInsets.fromLTRB(14, 0, 14, 14),
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.emeraldLight, borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.emerald.withValues(alpha: 0.4)),
            ),
            child: Center(child: Text('✓  Collected ₹${account.recoveryAmount!.toStringAsFixed(0)}',
                style: GoogleFonts.dmSans(color: AppColors.emeraldDark, fontWeight: FontWeight.w600, fontSize: 13))),
          ),
        ],
      ]),
    );
  }

  Widget _vDiv() => Container(width: 1, height: 30, margin: const EdgeInsets.symmetric(horizontal: 8), color: AppColors.border);
  String _f(double v) => v >= 1000 ? '${(v / 1000).toStringAsFixed(1)}K' : v.toStringAsFixed(0);
}

class _BalTile extends StatelessWidget {
  final String label, value;
  final Color color;
  const _BalTile(this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) => Expanded(
    child: Column(children: [
      Text(value, style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700, color: color)),
      const SizedBox(height: 2),
      Text(label, style: GoogleFonts.dmSans(fontSize: 9, color: AppColors.textSecondary), textAlign: TextAlign.center),
    ]),
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
