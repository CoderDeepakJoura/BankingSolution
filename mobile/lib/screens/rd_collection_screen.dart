import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';
import '../models.dart';
import '../services/api_service.dart';
import '../widgets.dart';
import 'receipt_screen.dart';

class RDCollectionScreen extends StatefulWidget {
  final AgentInfo agent;
  const RDCollectionScreen({super.key, required this.agent});

  @override
  State<RDCollectionScreen> createState() => _RDCollectionScreenState();
}

class _RDCollectionScreenState extends State<RDCollectionScreen> {
  List<RDAccount> _accounts = [];
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
      final dtos = await agentApi.getRDAccounts();
      final accounts = dtos.map(RDAccount.fromDto).toList();
      final map = <int, TextEditingController>{};
      for (final a in accounts) {
        map[a.accountId] = TextEditingController(text: a.kistAmount.toStringAsFixed(0));
      }
      if (mounted) setState(() { _accounts = accounts; _ctrlMap.addAll(map); _loading = false; });
    } on ApiException catch (e) {
      if (mounted) setState(() { _loadError = e.message; _loading = false; });
    }
  }

  List<RDAccount> get _filtered => _accounts
      .where((a) => _search.isEmpty || a.accountName.toLowerCase().contains(_search.toLowerCase()) || a.accountNumber.contains(_search))
      .toList();

  int get _collectedCount => _accounts.where((a) => a.collectedAmount != null).length;

  Future<void> _collect(RDAccount acc) async {
    final val = double.tryParse(_ctrlMap[acc.accountId]?.text ?? '');
    if (val == null || val <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Enter a valid amount', style: GoogleFonts.dmSans()), backgroundColor: AppColors.danger),
      );
      return;
    }
    try {
      final result = await agentApi.postCollection(
        accountId: acc.accountId, accType: 'RD', amount: val, notes: '',
      );
      if (!mounted) return;
      setState(() => acc.collectedAmount = val);
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => ReceiptScreen(receipt: CollectionReceipt(
          collectionId: result.collectionId,
          accountNumber: acc.accountNumber, accountName: acc.accountName,
          accountType: 'RD Kist — ${acc.productName}',
          agentName: widget.agent.agentName, mobileNumber: acc.mobileNumber,
          amount: val, collectionDate: DateTime.now(),
        )),
      ));
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message, style: GoogleFonts.dmSans()), backgroundColor: AppColors.danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Column(
        children: [
          ScreenHeader(
            title: 'RD Collection', subtitle: 'Recurring Deposit Kist',
            gradient: AppColors.rdGradient, icon: Icons.autorenew_rounded,
            collected: _collectedCount, total: _accounts.length,
          ),

          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
            child: TextField(
              onChanged: (v) => setState(() => _search = v),
              style: GoogleFonts.dmSans(fontSize: 14, color: AppColors.textPrimary),
              decoration: InputDecoration(
                hintText: 'Search by name or account no…',
                prefixIcon: const Icon(Icons.search_rounded, size: 19, color: AppColors.textSecondary),
              ),
            ),
          ),

          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppColors.navy))
                : _loadError != null
                    ? _ErrorView(message: _loadError!, onRetry: _loadAccounts)
                    : _filtered.isEmpty
                        ? Center(child: Text('No accounts found', style: GoogleFonts.dmSans(color: AppColors.textMuted)))
                        : ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 10, 16, 100),
                            itemCount: _filtered.length,
                            itemBuilder: (_, i) {
                              final acc = _filtered[i];
                              return _RDCard(
                                account: acc,
                                controller: _ctrlMap[acc.accountId]!,
                                onCollect: () => _collect(acc),
                              ).animate().fadeIn(delay: (i * 40).ms).slideY(begin: 0.1);
                            },
                          ),
          ),
        ],
      ),
      floatingActionButton: (_accounts.isNotEmpty && _collectedCount < _accounts.length)
          ? FloatingActionButton.extended(
              onPressed: _collectAll,
              backgroundColor: AppColors.navy,
              icon: const Icon(Icons.done_all_rounded),
              label: Text('Collect All', style: GoogleFonts.dmSans(fontWeight: FontWeight.w600)),
            )
          : null,
    );
  }

  Future<void> _collectAll() async {
    for (final acc in _accounts) {
      if (acc.collectedAmount == null) {
        final val = double.tryParse(_ctrlMap[acc.accountId]?.text ?? '');
        if (val != null && val > 0) {
          try {
            await agentApi.postCollection(accountId: acc.accountId, accType: 'RD', amount: val);
            if (mounted) setState(() => acc.collectedAmount = val);
          } catch (_) {}
        }
      }
    }
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('All collections recorded!', style: GoogleFonts.dmSans()), backgroundColor: AppColors.success),
    );
  }
}

class _RDCard extends StatelessWidget {
  final RDAccount account;
  final TextEditingController controller;
  final VoidCallback onCollect;
  const _RDCard({required this.account, required this.controller, required this.onCollect});

  @override
  Widget build(BuildContext context) {
    final done = account.collectedAmount != null;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: AppColors.card(radius: 16, borderColor: done ? AppColors.emerald.withValues(alpha: 0.4) : null),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(children: [
              AccountAvatar(name: account.accountName, color: AppColors.rdColor),
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
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text(account.accountNumber, style: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.navy)),
              ]),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Row(children: [
              InfoChip(account.productName, AppColors.navy),
              const SizedBox(width: 8),
              InfoChip('Bal ₹${_f(account.balance)}', AppColors.textSecondary),
              const SizedBox(width: 8),
              InfoChip('Kist ₹${_f(account.kistAmount)}', AppColors.warning),
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
                  decoration: const InputDecoration(
                    labelText: 'Amount Collected (₹)',
                    prefixText: '₹ ',
                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                )),
                const SizedBox(width: 10),
                GestureDetector(
                  onTap: onCollect,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    decoration: BoxDecoration(
                      gradient: AppColors.rdGradient, borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text('Collect', style: GoogleFonts.dmSans(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
                  ),
                ),
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
              child: Center(child: Text('✓  Collected ₹${_f(account.collectedAmount!)}',
                  style: GoogleFonts.dmSans(color: AppColors.emeraldDark, fontWeight: FontWeight.w600, fontSize: 13))),
            ),
          ],
        ],
      ),
    );
  }

  String _f(double v) => v >= 1000 ? '${(v / 1000).toStringAsFixed(1)}K' : v.toStringAsFixed(0);
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
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
