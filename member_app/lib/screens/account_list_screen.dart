import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../theme.dart';
import 'ledger_screen.dart';

class AccountListScreen extends StatelessWidget {
  final String label;
  final List<MemberAccount> accounts;
  final Color color;
  final IconData icon;

  const AccountListScreen({
    super.key,
    required this.label,
    required this.accounts,
    required this.color,
    required this.icon,
  });

  String _fmt(double v) =>
      NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 2).format(v.abs());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        backgroundColor: color,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text(label,
          style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        top: false,
        child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: accounts.length,
        itemBuilder: (ctx, i) {
          final acc = accounts[i];
          final isLoan = acc.accountType == 'Loan';
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
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
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => LedgerScreen(account: acc, color: color, icon: icon),
                  ),
                ),
                borderRadius: BorderRadius.circular(14),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Row(
                    children: [
                      Container(
                        width: 44, height: 44,
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(icon, color: color, size: 22),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(acc.accountName,
                              style: GoogleFonts.inter(
                                fontSize: 14, fontWeight: FontWeight.w600,
                                color: acc.isClosed ? Colors.grey : const Color(0xFF1A202C)),
                              maxLines: 1, overflow: TextOverflow.ellipsis),
                            const SizedBox(height: 3),
                            Text('A/C: ${acc.accountIdentifier}',
                              style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade500)),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(_fmt(acc.balance),
                            style: GoogleFonts.inter(
                              fontSize: 14, fontWeight: FontWeight.w700,
                              color: isLoan && acc.balance > 0 ? AppColors.error : const Color(0xFF1A202C))),
                          if (acc.isClosed)
                            Container(
                              margin: const EdgeInsets.only(top: 4),
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
                      ),
                      const SizedBox(width: 4),
                      Icon(Icons.chevron_right_rounded, color: Colors.grey.shade300),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
      ),
    );
  }
}
