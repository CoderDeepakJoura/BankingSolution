import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme.dart';
import '../models.dart';
import '../services/api_service.dart';
import '../services/secure_storage.dart';
import 'login_screen.dart';
import 'rd_collection_screen.dart';
import 'saving_screen.dart';
import 'loan_screen.dart';
import 'super_agent_dashboard.dart';

class DashboardScreen extends StatefulWidget {
  final AgentInfo agent;
  const DashboardScreen({super.key, required this.agent});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _rdCount = 0, _savingCount = 0, _loanCount = 0;
  bool _loadingCounts = true;

  @override
  void initState() {
    super.initState();
    _loadCounts();
  }

  Future<void> _loadCounts() async {
    try {
      final results = await Future.wait([
        agentApi.getRDAccounts(),
        agentApi.getSavingAccounts(),
        agentApi.getLoanAccounts(),
      ]);
      if (mounted) setState(() {
        _rdCount     = results[0].length;
        _savingCount = results[1].length;
        _loanCount   = results[2].length;
        _loadingCounts = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingCounts = false);
    }
  }

  int get _total => _rdCount + _savingCount + _loanCount;

  @override
  Widget build(BuildContext context) {
    final now      = DateTime.now();
    final greeting = now.hour < 12 ? 'Good Morning' : now.hour < 17 ? 'Good Afternoon' : 'Good Evening';
    final today    = DateFormat('EEE, d MMM yyyy').format(now);
    final agent    = widget.agent;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: CustomScrollView(
        slivers: [
          // ── Hero header ────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF1E3A8A), Color(0xFF1D4ED8), Color(0xFF2563EB)],
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
              ),
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(greeting, style: GoogleFonts.dmSans(fontSize: 12, color: Colors.white.withValues(alpha: 0.75))),
                              const SizedBox(height: 2),
                              Text(agent.agentName,
                                style: GoogleFonts.dmSans(fontSize: 22, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: -0.3))
                                  .animate().fadeIn().slideX(begin: -0.15),
                            ]),
                          ),
                          GestureDetector(
                            onTap: () => _showProfileSheet(context),
                            child: Container(
                              width: 46, height: 46,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white.withValues(alpha: 0.35), width: 1.5),
                              ),
                              child: Center(child: Text(agent.avatarInitials,
                                style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white))),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      Row(children: [
                        const Icon(Icons.location_on_rounded, size: 13, color: Colors.white70),
                        const SizedBox(width: 4),
                        Expanded(child: Text(
                          agent.branchName.isNotEmpty ? agent.branchName : 'Branch',
                          style: GoogleFonts.dmSans(fontSize: 12, color: Colors.white.withValues(alpha: 0.8)),
                          overflow: TextOverflow.ellipsis,
                        )),
                        const SizedBox(width: 12),
                        const Icon(Icons.calendar_today_rounded, size: 12, color: Colors.white70),
                        const SizedBox(width: 4),
                        Text(today, style: GoogleFonts.dmSans(fontSize: 12, color: Colors.white.withValues(alpha: 0.8))),
                      ]),

                      const SizedBox(height: 20),

                      // Stats row
                      if (!_loadingCounts)
                        Row(
                          children: [
                            _heroPill('Total', '$_total', Colors.white, Colors.white.withValues(alpha: 0.25)),
                            const SizedBox(width: 10),
                            _heroPill('RD', '$_rdCount', const Color(0xFFA5B4FC), Colors.white.withValues(alpha: 0.15)),
                            const SizedBox(width: 10),
                            _heroPill('Saving', '$_savingCount', const Color(0xFF6EE7B7), Colors.white.withValues(alpha: 0.15)),
                            const SizedBox(width: 10),
                            _heroPill('Loan', '$_loanCount', const Color(0xFFFCD34D), Colors.white.withValues(alpha: 0.15)),
                          ].map((w) => Expanded(child: w)).toList(),
                        )
                      else
                        const SizedBox(height: 38, child: Center(child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // ── Super agent button ─────────────────────────────────────────
          if (agent.isSuperAgent)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: GestureDetector(
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => SuperAgentDashboard(agent: agent))),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFF6D28D9)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [BoxShadow(color: const Color(0xFF7C3AED).withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4))],
                    ),
                    child: Row(children: [
                      const Icon(Icons.admin_panel_settings_rounded, color: Colors.white, size: 20),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Super Agent Dashboard', style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
                        Text('View all agents\' collection summary', style: GoogleFonts.dmSans(fontSize: 11, color: Colors.white.withValues(alpha: 0.8))),
                      ])),
                      const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.white70),
                    ]),
                  ),
                ).animate().fadeIn(delay: 200.ms),
              ),
            ),

          // ── Section label ──────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 28, 20, 14),
              child: Row(children: [
                Container(width: 3, height: 16,
                  decoration: BoxDecoration(color: AppColors.navy, borderRadius: BorderRadius.circular(2))),
                const SizedBox(width: 10),
                Text('Collection Modules', style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary, letterSpacing: 0.2)),
              ]),
            ),
          ),

          // ── Module cards ───────────────────────────────────────────────
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _ModuleCard(
                  label: 'RD Collection', subtitle: 'Recurring Deposit Kist',
                  count: _rdCount, gradient: AppColors.rdGradient,
                  icon: Icons.autorenew_rounded, countLoading: _loadingCounts,
                  onTap: () => Navigator.push(context, MaterialPageRoute(
                    builder: (_) => RDCollectionScreen(agent: agent))),
                ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.2),
                const SizedBox(height: 14),
                _ModuleCard(
                  label: 'Saving Collection', subtitle: 'Deposit & Withdrawal',
                  count: _savingCount, gradient: AppColors.savingGradient,
                  icon: Icons.savings_rounded, countLoading: _loadingCounts,
                  onTap: () => Navigator.push(context, MaterialPageRoute(
                    builder: (_) => SavingScreen(agent: agent))),
                ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2),
                const SizedBox(height: 14),
                _ModuleCard(
                  label: 'Loan Recovery', subtitle: 'EMI & Interest Collection',
                  count: _loanCount, gradient: AppColors.loanGradient,
                  icon: Icons.account_balance_wallet_rounded, countLoading: _loadingCounts,
                  onTap: () => Navigator.push(context, MaterialPageRoute(
                    builder: (_) => LoanScreen(agent: agent))),
                ).animate().fadeIn(delay: 500.ms).slideY(begin: 0.2),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _heroPill(String label, String value, Color textColor, Color bgColor) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(12)),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text(value, style: GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w700, color: textColor)),
        Text(label, style: GoogleFonts.dmSans(fontSize: 9, color: textColor.withValues(alpha: 0.8)), textAlign: TextAlign.center),
      ]),
    );
  }

  void _showProfileSheet(BuildContext ctx) {
    showModalBottomSheet(
      context: ctx,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        margin: const EdgeInsets.all(12),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.border)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 36, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 20),
            Container(
              width: 56, height: 56,
              decoration: BoxDecoration(gradient: AppColors.primaryGradient, shape: BoxShape.circle),
              child: Center(child: Text(widget.agent.avatarInitials,
                style: GoogleFonts.dmSans(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white))),
            ),
            const SizedBox(height: 12),
            Text(widget.agent.agentName,
              style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
            if (widget.agent.branchName.isNotEmpty)
              Text(widget.agent.branchName,
                style: GoogleFonts.dmSans(fontSize: 12, color: AppColors.textSecondary)),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.logout_rounded, color: AppColors.danger, size: 18),
                label: Text('Sign Out', style: GoogleFonts.dmSans(color: AppColors.danger, fontWeight: FontWeight.w600)),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: AppColors.danger.withValues(alpha: 0.5)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: () async {
                  Navigator.pop(ctx);
                  await agentApi.logout();
                  if (mounted) Navigator.pushReplacement(ctx, MaterialPageRoute(builder: (_) => const LoginScreen()));
                },
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

class _ModuleCard extends StatelessWidget {
  final String label, subtitle;
  final int count;
  final LinearGradient gradient;
  final IconData icon;
  final bool countLoading;
  final VoidCallback onTap;
  const _ModuleCard({required this.label, required this.subtitle, required this.count, required this.gradient, required this.icon, required this.countLoading, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: AppColors.card(radius: 20),
        child: Row(children: [
          Container(
            width: 56, height: 56,
            decoration: BoxDecoration(gradient: gradient, borderRadius: BorderRadius.circular(16),
              boxShadow: [BoxShadow(color: gradient.colors.first.withValues(alpha: 0.3), blurRadius: 14, offset: const Offset(0, 5))]),
            child: Icon(icon, color: Colors.white, size: 26),
          ),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label,    style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
            const SizedBox(height: 2),
            Text(subtitle, style: GoogleFonts.dmSans(fontSize: 11, color: AppColors.textSecondary)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(gradient: gradient, borderRadius: BorderRadius.circular(20)),
              child: countLoading
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 1.5))
                  : Text('$count', style: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
            ),
            const SizedBox(height: 6),
            Icon(Icons.arrow_forward_ios_rounded, size: 13, color: AppColors.textMuted),
          ]),
        ]),
      ),
    );
  }
}
