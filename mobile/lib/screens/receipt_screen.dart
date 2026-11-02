import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme.dart';
import '../models.dart';

class ReceiptScreen extends StatefulWidget {
  final CollectionReceipt receipt;
  const ReceiptScreen({super.key, required this.receipt});

  @override
  State<ReceiptScreen> createState() => _ReceiptScreenState();
}

class _ReceiptScreenState extends State<ReceiptScreen> {
  final _mobileCtrl = TextEditingController();
  bool _askMobile = false;

  @override
  void initState() {
    super.initState();
    _mobileCtrl.text = widget.receipt.mobileNumber;
  }

  @override
  void dispose() {
    _mobileCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendTelegram() async {
    final mobile = _mobileCtrl.text.trim();
    if (mobile.isEmpty) { setState(() => _askMobile = true); return; }
    final r = widget.receipt;
    final msg = Uri.encodeComponent(
      '🏦 *Sicswave Fincore — Collection Receipt*\n\n'
      '📋 Receipt #${r.collectionId}\n'
      '📅 Date: ${DateFormat('dd MMM yyyy, hh:mm a').format(r.collectionDate)}\n'
      '─────────────────────\n'
      '👤 Account: ${r.accountName}\n'
      '🔢 Acc No: ${r.accountNumber}\n'
      '📝 Type: ${r.accountType}\n'
      '─────────────────────\n'
      '💰 Amount: ₹${r.amount.toStringAsFixed(0)}\n'
      '─────────────────────\n'
      '👮 Agent: ${r.agentName}\n\n'
      '_Thank you for your payment!_',
    );
    final url = Uri.parse('https://t.me/share/url?url=%20&text=$msg');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open Telegram', style: GoogleFonts.dmSans()), backgroundColor: AppColors.danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final r       = widget.receipt;
    final dateStr = DateFormat('dd MMM yyyy, hh:mm a').format(r.collectionDate);
    final hasMobile = r.mobileNumber.isNotEmpty;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            // App bar
            Container(
              padding: const EdgeInsets.fromLTRB(16, 14, 20, 14),
              color: AppColors.white,
              child: Row(children: [
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    width: 38, height: 38,
                    decoration: BoxDecoration(color: AppColors.surfaceAlt, borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.border)),
                    child: const Icon(Icons.arrow_back_ios_rounded, size: 16, color: AppColors.textSecondary),
                  ),
                ),
                const SizedBox(width: 12),
                Text('Collection Receipt',
                  style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              ]),
            ),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(children: [
                  // Success mark
                  Container(
                    width: 72, height: 72,
                    decoration: BoxDecoration(gradient: AppColors.savingGradient, shape: BoxShape.circle,
                      boxShadow: [BoxShadow(color: AppColors.emerald.withValues(alpha: 0.3), blurRadius: 24)]),
                    child: const Icon(Icons.check_rounded, color: Colors.white, size: 34),
                  ).animate().scale(duration: 500.ms, curve: Curves.elasticOut),

                  const SizedBox(height: 14),
                  Text('Payment Recorded!',
                    style: GoogleFonts.dmSans(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.textPrimary))
                      .animate().fadeIn(delay: 200.ms),
                  Text('Collection #${r.collectionId}',
                    style: GoogleFonts.dmSans(fontSize: 12, color: AppColors.textSecondary))
                      .animate().fadeIn(delay: 280.ms),

                  const SizedBox(height: 24),

                  // Receipt card
                  Container(
                    decoration: AppColors.card(radius: 20),
                    child: Column(children: [
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 22),
                        decoration: BoxDecoration(
                          color: AppColors.emeraldLight,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                        ),
                        child: Column(children: [
                          Text('₹${r.amount.toStringAsFixed(0)}',
                            style: GoogleFonts.dmSans(fontSize: 38, fontWeight: FontWeight.w800,
                              color: AppColors.emeraldDark, letterSpacing: -1)),
                          Text(r.accountType, style: GoogleFonts.dmSans(fontSize: 12, color: AppColors.textSecondary)),
                        ]),
                      ),
                      Divider(height: 1, color: AppColors.border),
                      _Row('Account Name', r.accountName),
                      _Row('Account No.', r.accountNumber),
                      _Row('Date & Time', dateStr),
                      _Row('Agent', r.agentName),
                      _Row('Collection ID', '#${r.collectionId}'),
                      const SizedBox(height: 8),
                    ]),
                  ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.15),

                  const SizedBox(height: 20),

                  // Send receipt
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: AppColors.card(radius: 20),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Send Receipt', style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                      const SizedBox(height: 4),
                      Text(hasMobile ? 'Mobile on record — ready to share via Telegram.' : 'No mobile number on record.',
                        style: GoogleFonts.dmSans(fontSize: 12, color: AppColors.textSecondary)),

                      if (_askMobile || !hasMobile) ...[
                        const SizedBox(height: 14),
                        TextField(
                          controller: _mobileCtrl,
                          keyboardType: TextInputType.phone,
                          style: GoogleFonts.dmSans(fontSize: 14, color: AppColors.textPrimary),
                          decoration: const InputDecoration(
                            labelText: 'Mobile Number',
                            prefixIcon: Icon(Icons.phone_rounded, size: 18, color: AppColors.textSecondary),
                            contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          ),
                        ),
                      ],

                      const SizedBox(height: 16),

                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          icon: const Icon(Icons.send_rounded, size: 18),
                          label: Text('Send via Telegram', style: GoogleFonts.dmSans(fontWeight: FontWeight.w600)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF229ED9), foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: _sendTelegram,
                        ),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.screenshot_rounded, size: 18, color: AppColors.textSecondary),
                          label: Text('Screenshot to download',
                            style: GoogleFonts.dmSans(color: AppColors.textSecondary, fontWeight: FontWeight.w600)),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.border),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                              content: Text('Take a screenshot to save this receipt.', style: GoogleFonts.dmSans()),
                              backgroundColor: AppColors.textPrimary,
                            ));
                          },
                        ),
                      ),
                    ]),
                  ).animate().fadeIn(delay: 420.ms).slideY(begin: 0.15),

                  const SizedBox(height: 20),

                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      child: Text('Done — Back to Collection',
                        style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w700)),
                    ),
                  ).animate().fadeIn(delay: 520.ms),

                  const SizedBox(height: 24),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label, value;
  const _Row(this.label, this.value);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(width: 110, child: Text(label, style: GoogleFonts.dmSans(fontSize: 12, color: AppColors.textSecondary))),
      const SizedBox(width: 8),
      Expanded(child: Text(value,
        style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
        textAlign: TextAlign.end)),
    ]),
  );
}
