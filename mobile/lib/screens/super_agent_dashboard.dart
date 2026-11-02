import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme.dart';
import '../models.dart';
import '../services/api_service.dart';

class SuperAgentDashboard extends StatefulWidget {
  final AgentInfo agent;
  const SuperAgentDashboard({super.key, required this.agent});

  @override
  State<SuperAgentDashboard> createState() => _SuperAgentDashboardState();
}

class _SuperAgentDashboardState extends State<SuperAgentDashboard> {
  List<SuperAgentSummaryDto> _summary = [];
  bool _loading = true;
  String? _error;
  String _selectedDate = DateFormat('yyyy-MM-dd').format(DateTime.now());
  String? _selectedType; // null = all

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await agentApi.getSummary(
        date: _selectedDate,
        accType: _selectedType,
      );
      if (mounted) setState(() { _summary = data; _loading = false; });
    } on ApiException catch (e) {
      if (mounted) setState(() { _error = e.message; _loading = false; });
    }
  }

  double get _totalAmount => _summary.fold(0, (s, r) => s + r.totalAmount);
  int    get _totalCount  => _summary.fold(0, (s, r) => s + r.totalCollections);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Column(children: [
        // Header
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF6D28D9), Color(0xFF7C3AED)],
              begin: Alignment.topLeft, end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
          ),
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      width: 38, height: 38,
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(10)),
                      child: const Icon(Icons.arrow_back_ios_rounded, color: Colors.white, size: 16),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Icon(Icons.admin_panel_settings_rounded, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Expanded(child: Text('Super Agent Dashboard',
                    style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white))),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded, color: Colors.white, size: 20),
                    onPressed: _load,
                  ),
                ]),

                const SizedBox(height: 20),

                // Summary tiles
                if (!_loading && _error == null)
                  Row(children: [
                    _heroPill('Total Collections', '$_totalCount', Colors.white),
                    const SizedBox(width: 12),
                    _heroPill('Total Amount', '₹${_fmtLarge(_totalAmount)}', const Color(0xFFA5B4FC)),
                  ].map((w) => Expanded(child: w)).toList()),
              ]),
            ),
          ),
        ),

        // Filters
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Row(children: [
            Expanded(
              child: GestureDetector(
                onTap: _pickDate,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: AppColors.card(radius: 12),
                  child: Row(children: [
                    const Icon(Icons.calendar_today_rounded, size: 16, color: AppColors.navy),
                    const SizedBox(width: 8),
                    Text(DateFormat('dd MMM yyyy').format(DateTime.parse(_selectedDate)),
                      style: GoogleFonts.dmSans(fontSize: 13, color: AppColors.textPrimary, fontWeight: FontWeight.w500)),
                  ]),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              decoration: AppColors.card(radius: 12),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String?>(
                  value: _selectedType,
                  style: GoogleFonts.dmSans(fontSize: 13, color: AppColors.textPrimary),
                  icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 18, color: AppColors.textSecondary),
                  items: [
                    DropdownMenuItem(value: null,   child: Text('All Types', style: GoogleFonts.dmSans(fontSize: 13))),
                    DropdownMenuItem(value: 'RD',     child: Text('RD', style: GoogleFonts.dmSans(fontSize: 13))),
                    DropdownMenuItem(value: 'Saving', child: Text('Saving', style: GoogleFonts.dmSans(fontSize: 13))),
                    DropdownMenuItem(value: 'Loan',   child: Text('Loan', style: GoogleFonts.dmSans(fontSize: 13))),
                  ],
                  onChanged: (v) => setState(() { _selectedType = v; _load(); }),
                ),
              ),
            ),
          ]),
        ),

        const SizedBox(height: 4),

        // Content
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF7C3AED)))
              : _error != null
                  ? _ErrorView(message: _error!, onRetry: _load)
                  : _summary.isEmpty
                      ? Center(child: Text('No collections for this date.',
                          style: GoogleFonts.dmSans(color: AppColors.textMuted)))
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 40),
                          itemCount: _summary.length,
                          itemBuilder: (_, i) => _SummaryCard(row: _summary[i])
                              .animate().fadeIn(delay: (i * 50).ms).slideY(begin: 0.1),
                        ),
        ),
      ]),
    );
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.parse(_selectedDate),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(primary: Color(0xFF7C3AED), onPrimary: Colors.white)),
        child: child!,
      ),
    );
    if (picked != null && mounted) {
      setState(() => _selectedDate = DateFormat('yyyy-MM-dd').format(picked));
      _load();
    }
  }

  Widget _heroPill(String label, String value, Color color) => Container(
    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(14)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(value, style: GoogleFonts.dmSans(fontSize: 20, fontWeight: FontWeight.w700, color: color)),
      Text(label, style: GoogleFonts.dmSans(fontSize: 10, color: Colors.white.withValues(alpha: 0.8))),
    ]),
  );

  String _fmtLarge(double v) {
    if (v >= 100000) return '${(v / 100000).toStringAsFixed(1)}L';
    if (v >= 1000)   return '${(v / 1000).toStringAsFixed(1)}K';
    return v.toStringAsFixed(0);
  }
}

class _SummaryCard extends StatelessWidget {
  final SuperAgentSummaryDto row;
  const _SummaryCard({required this.row});

  Color get _typeColor {
    switch (row.accType) {
      case 'RD':     return AppColors.navy;
      case 'Saving': return AppColors.emeraldDark;
      case 'Loan':   return AppColors.loanColor;
      default:       return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.all(16),
    decoration: AppColors.card(radius: 14),
    child: Row(children: [
      Container(
        width: 44, height: 44,
        decoration: BoxDecoration(
          color: _typeColor.withValues(alpha: 0.1), shape: BoxShape.circle,
          border: Border.all(color: _typeColor.withValues(alpha: 0.3))),
        child: Center(child: Text(row.accType[0],
          style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w700, color: _typeColor))),
      ),
      const SizedBox(width: 14),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(row.agentName,
          style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: _typeColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20),
              border: Border.all(color: _typeColor.withValues(alpha: 0.25))),
            child: Text(row.accType, style: GoogleFonts.dmSans(fontSize: 10, color: _typeColor, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(width: 8),
          Text('${row.totalCollections} collection${row.totalCollections == 1 ? '' : 's'}',
            style: GoogleFonts.dmSans(fontSize: 11, color: AppColors.textSecondary)),
        ]),
      ])),
      Text('₹${_fmt(row.totalAmount)}',
        style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
    ]),
  );

  String _fmt(double v) {
    if (v >= 100000) return '${(v / 100000).toStringAsFixed(1)}L';
    if (v >= 1000)   return '${(v / 1000).toStringAsFixed(1)}K';
    return v.toStringAsFixed(0);
  }
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
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF7C3AED),
            minimumSize: const Size(140, 44)),
        ),
      ]),
    ),
  );
}
