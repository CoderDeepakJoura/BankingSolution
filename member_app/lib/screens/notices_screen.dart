import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class NoticesScreen extends StatelessWidget {
  const NoticesScreen({super.key});

  static const _notices = [
    _Notice(Icons.info_outlined, Color(0xFF1565C0), 'System Maintenance',
        'The system will be down for maintenance from 11 PM to 1 AM tonight.', 'General'),
    _Notice(Icons.campaign_outlined, Color(0xFF00695C), 'New Scheme Available',
        'A new Fixed Deposit scheme at 8.5% p.a. is now available. Visit your branch to enroll.',
        'Scheme'),
    _Notice(Icons.star_outline_rounded, Color(0xFFE65100), 'Annual General Meeting',
        'The Annual General Meeting will be held on 15th of next month. All members are requested to attend.',
        'Important'),
    _Notice(Icons.percent_rounded, Color(0xFF1B5E20), 'Interest Rate Update',
        'RD interest rates have been revised. Please check the updated rates at your branch.', 'Scheme'),
  ];

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
        title: Text('Notices & Alerts',
          style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
        elevation: 0,
      ),
      body: SafeArea(
        top: false,
        child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _notices.length,
        itemBuilder: (ctx, i) {
          final n = _notices[i];
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6, offset: const Offset(0, 2)),
              ],
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 42, height: 42,
                  decoration: BoxDecoration(
                    color: n.color.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(n.icon, color: n.color, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(n.title,
                              style: GoogleFonts.inter(
                                fontSize: 13, fontWeight: FontWeight.w700,
                                color: const Color(0xFF1A202C))),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: n.color.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(n.tag,
                              style: GoogleFonts.inter(
                                fontSize: 9, fontWeight: FontWeight.w700, color: n.color)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(n.body,
                        style: GoogleFonts.inter(
                          fontSize: 12, color: Colors.grey.shade600, height: 1.5)),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
      ),
    );
  }
}

class _Notice {
  final IconData icon;
  final Color color;
  final String title;
  final String body;
  final String tag;

  const _Notice(this.icon, this.color, this.title, this.body, this.tag);
}
