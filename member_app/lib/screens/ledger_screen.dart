import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../theme.dart';

class LedgerScreen extends StatefulWidget {
  final MemberAccount account;
  final Color color;
  final IconData icon;

  const LedgerScreen({
    super.key,
    required this.account,
    required this.color,
    required this.icon,
  });

  @override
  State<LedgerScreen> createState() => _LedgerScreenState();
}

class _LedgerScreenState extends State<LedgerScreen> {
  LedgerData? _ledger;
  bool _loading = false;
  String? _error;

  late DateTime _fromDate;
  late DateTime _toDate;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    // Default: current financial year (April 1)
    _fromDate = now.month >= 4
        ? DateTime(now.year, 4, 1)
        : DateTime(now.year - 1, 4, 1);
    _toDate = now;
    _fetchLedger();
  }

  Future<void> _fetchLedger() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await ApiService.getLedger(
        accountId: widget.account.accountId,
        accountType: widget.account.accountType,
        fromDate: DateFormat('yyyy-MM-dd').format(_fromDate),
        toDate: DateFormat('yyyy-MM-dd').format(_toDate),
      );
      if (res['success'] == true) {
        setState(() => _ledger = LedgerData.fromJson(res['data'] as Map<String, dynamic>));
      } else {
        setState(() => _error = res['message'] as String? ?? 'Failed to load ledger.');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickDate(bool isFrom) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isFrom ? _fromDate : _toDate,
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: Theme.of(ctx).colorScheme.copyWith(primary: widget.color),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() {
        if (isFrom) _fromDate = picked;
        else _toDate = picked;
      });
      _fetchLedger();
    }
  }

  String _fmt(double amount) =>
      NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 2).format(amount.abs());

  String _fmtDate(DateTime d) => DateFormat('dd MMM yy').format(d);

  Future<void> _downloadPdf() async {
    if (_ledger == null) return;
    final pdfBytes = await _buildPdf();
    await Printing.layoutPdf(onLayout: (_) => pdfBytes);
  }

  Future<Uint8List> _buildPdf() async {
    // Load Noto Sans — full Unicode support including ₹ and em-dash
    final font = await PdfGoogleFonts.notoSansRegular();
    final fontBold = await PdfGoogleFonts.notoSansBold();

    final doc = pw.Document(
      theme: pw.ThemeData.withFont(base: font, bold: fontBold),
    );
    final ledger = _ledger!;
    final dateRange =
        '${DateFormat('dd MMM yyyy').format(_fromDate)} to ${DateFormat('dd MMM yyyy').format(_toDate)}';

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        header: (ctx) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              ledger.accountName,
              style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold),
            ),
            pw.SizedBox(height: 4),
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(
                  '${widget.account.accountType} — ${ledger.accountIdentifier}',
                  style: const pw.TextStyle(fontSize: 11, color: PdfColors.grey600),
                ),
                pw.Text(
                  dateRange,
                  style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey600),
                ),
              ],
            ),
            pw.Divider(height: 12),
          ],
        ),
        build: (ctx) => [
          // Opening balance row
          pw.Container(
            padding: const pw.EdgeInsets.symmetric(vertical: 6, horizontal: 8),
            color: PdfColors.grey100,
            child: pw.Row(
              children: [
                pw.Expanded(flex: 2, child: pw.Text('Opening Balance',
                    style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10))),
                pw.Expanded(child: pw.SizedBox()),
                pw.Expanded(child: pw.SizedBox()),
                pw.Expanded(
                  child: pw.Text(
                    _fmt(ledger.openingBalance),
                    style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
                    textAlign: pw.TextAlign.right,
                  ),
                ),
              ],
            ),
          ),

          // Table header
          pw.Container(
            color: const PdfColor.fromInt(0xFF1A56DB),
            padding: const pw.EdgeInsets.symmetric(vertical: 7, horizontal: 8),
            child: pw.Row(
              children: [
                pw.Expanded(flex: 1, child: _hdr('Date')),
                pw.Expanded(flex: 3, child: _hdr('Particulars')),
                pw.Expanded(flex: 2, child: _hdr('Debit', right: true)),
                pw.Expanded(flex: 2, child: _hdr('Credit', right: true)),
                pw.Expanded(flex: 2, child: _hdr('Balance', right: true)),
              ],
            ),
          ),

          // Entries
          ...ledger.entries.asMap().entries.map((e) {
            final entry = e.value;
            final bg = e.key.isEven ? PdfColors.white : PdfColors.grey50;
            return pw.Container(
              color: bg,
              padding: const pw.EdgeInsets.symmetric(vertical: 5, horizontal: 8),
              child: pw.Row(
                children: [
                  pw.Expanded(flex: 1, child: pw.Text(_fmtDate(entry.voucherDate),
                      style: const pw.TextStyle(fontSize: 9))),
                  pw.Expanded(flex: 3, child: pw.Text(entry.particulars,
                      style: const pw.TextStyle(fontSize: 9))),
                  pw.Expanded(flex: 2, child: pw.Text(
                      entry.dr != null ? _fmt(entry.dr!) : '',
                      style: const pw.TextStyle(fontSize: 9, color: PdfColors.red700),
                      textAlign: pw.TextAlign.right)),
                  pw.Expanded(flex: 2, child: pw.Text(
                      entry.cr != null ? _fmt(entry.cr!) : '',
                      style: const pw.TextStyle(fontSize: 9, color: PdfColors.green700),
                      textAlign: pw.TextAlign.right)),
                  pw.Expanded(flex: 2, child: pw.Text(
                      _fmt(entry.balance),
                      style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold),
                      textAlign: pw.TextAlign.right)),
                ],
              ),
            );
          }),

          pw.SizedBox(height: 4),
          pw.Divider(),

          // Totals
          pw.Container(
            padding: const pw.EdgeInsets.symmetric(vertical: 7, horizontal: 8),
            color: PdfColors.grey100,
            child: pw.Row(
              children: [
                pw.Expanded(flex: 1, child: pw.SizedBox()),
                pw.Expanded(flex: 3, child: pw.Text('Closing Balance',
                    style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10))),
                pw.Expanded(flex: 2, child: pw.Text(_fmt(ledger.totalDr),
                    style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold,
                        color: PdfColors.red700),
                    textAlign: pw.TextAlign.right)),
                pw.Expanded(flex: 2, child: pw.Text(_fmt(ledger.totalCr),
                    style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold,
                        color: PdfColors.green700),
                    textAlign: pw.TextAlign.right)),
                pw.Expanded(flex: 2, child: pw.Text(_fmt(ledger.closingBalance),
                    style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
                    textAlign: pw.TextAlign.right)),
              ],
            ),
          ),
        ],
      ),
    );

    return doc.save();
  }

  pw.Widget _hdr(String text, {bool right = false}) => pw.Text(
    text,
    style: pw.TextStyle(color: PdfColors.white, fontWeight: pw.FontWeight.bold, fontSize: 9),
    textAlign: right ? pw.TextAlign.right : pw.TextAlign.left,
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      body: NestedScrollView(
        headerSliverBuilder: (ctx, _) => [
          SliverAppBar(
            expandedHeight: 160,
            pinned: true,
            backgroundColor: widget.color,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
            title: Text(
              widget.account.accountName,
              style: const TextStyle(color: Colors.white, fontSize: 15),
              overflow: TextOverflow.ellipsis,
            ),
            actions: [
              if (_ledger != null)
                IconButton(
                  icon: const Icon(Icons.download_outlined, color: Colors.white),
                  tooltip: 'Download PDF',
                  onPressed: _downloadPdf,
                ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Builder(
                builder: (ctx) {
                  final topPad = MediaQuery.of(ctx).padding.top + kToolbarHeight;
                  return Container(
                    clipBehavior: Clip.hardEdge,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [widget.color, widget.color.withOpacity(0.75)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    padding: EdgeInsets.fromLTRB(24, topPad + 8, 24, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Row(
                          children: [
                            Icon(widget.icon, color: Colors.white, size: 18),
                            const SizedBox(width: 7),
                            Text(
                              widget.account.accountType,
                              style: GoogleFonts.inter(color: Colors.white.withOpacity(0.8), fontSize: 12),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.account.accountName,
                          style: GoogleFonts.inter(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.account.accountIdentifier,
                          style: GoogleFonts.inter(color: Colors.white.withOpacity(0.6), fontSize: 11),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
        ],
        body: Column(
          children: [
            // Date range selector
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(child: _DateChip(
                    label: 'From',
                    date: _fromDate,
                    onTap: () => _pickDate(true),
                    color: widget.color,
                  )),
                  const SizedBox(width: 10),
                  Expanded(child: _DateChip(
                    label: 'To',
                    date: _toDate,
                    onTap: () => _pickDate(false),
                    color: widget.color,
                  )),
                  const SizedBox(width: 10),
                  InkWell(
                    onTap: _fetchLedger,
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: widget.color.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(Icons.search, color: widget.color, size: 22),
                    ),
                  ),
                ],
              ),
            ),

            // Content
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? _buildError()
                      : _buildLedger(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError() => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: AppColors.error.withOpacity(0.7)),
          const SizedBox(height: 12),
          Text(_error!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 14)),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _fetchLedger,
            style: ElevatedButton.styleFrom(backgroundColor: widget.color),
            child: const Text('Try Again'),
          ),
        ],
      ),
    ),
  );

  Widget _buildLedger() {
    final ledger = _ledger;
    if (ledger == null || ledger.entries.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.receipt_long_outlined, size: 56, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text('No transactions in this period', style: TextStyle(color: Colors.grey.shade500)),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Summary row
        _SummaryBar(ledger: ledger, color: widget.color, fmt: _fmt),

        // Table header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: widget.color.withOpacity(0.1),
          child: Row(
            children: [
              Expanded(flex: 2, child: Text('Date', style: _headerStyle())),
              Expanded(flex: 3, child: Text('Particulars', style: _headerStyle())),
              Expanded(flex: 2, child: Text('Debit', style: _headerStyle(), textAlign: TextAlign.right)),
              Expanded(flex: 2, child: Text('Credit', style: _headerStyle(), textAlign: TextAlign.right)),
              Expanded(flex: 2, child: Text('Balance', style: _headerStyle(), textAlign: TextAlign.right)),
            ],
          ),
        ),

        // Entries
        Expanded(
          child: ListView.builder(
            itemCount: ledger.entries.length,
            itemBuilder: (ctx, i) {
              final e = ledger.entries[i];
              final bg = i.isEven ? Colors.white : const Color(0xFFF8FAFC);

              return Container(
                color: bg,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                child: Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: Text(
                        DateFormat('dd/MM/yy').format(e.voucherDate),
                        style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade600),
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: Text(
                        e.particulars,
                        style: GoogleFonts.inter(fontSize: 11),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        e.dr != null ? _fmt(e.dr!) : '',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: e.dr != null ? AppColors.error : null,
                          fontWeight: e.dr != null ? FontWeight.w500 : FontWeight.normal,
                        ),
                        textAlign: TextAlign.right,
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        e.cr != null ? _fmt(e.cr!) : '',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: e.cr != null ? AppColors.success : null,
                          fontWeight: e.cr != null ? FontWeight.w500 : FontWeight.normal,
                        ),
                        textAlign: TextAlign.right,
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        _fmt(e.balance),
                        style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600),
                        textAlign: TextAlign.right,
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: Duration(milliseconds: 20 * i));
            },
          ),
        ),
      ],
    );
  }

  TextStyle _headerStyle() => GoogleFonts.inter(
    fontSize: 11,
    fontWeight: FontWeight.w700,
    color: widget.color,
  );
}

class _DateChip extends StatelessWidget {
  final String label;
  final DateTime date;
  final VoidCallback onTap;
  final Color color;

  const _DateChip({
    required this.label,
    required this.date,
    required this.onTap,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Row(
          children: [
            Icon(Icons.calendar_today_outlined, size: 14, color: color),
            const SizedBox(width: 6),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: GoogleFonts.inter(fontSize: 9, color: Colors.grey.shade500)),
                Text(
                  DateFormat('dd MMM yyyy').format(date),
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryBar extends StatelessWidget {
  final LedgerData ledger;
  final Color color;
  final String Function(double) fmt;

  const _SummaryBar({required this.ledger, required this.color, required this.fmt});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: color.withOpacity(0.06),
      child: Row(
        children: [
          _stat('Opening', fmt(ledger.openingBalance), Colors.grey),
          _divider(),
          _stat('Total Dr', fmt(ledger.totalDr), AppColors.error),
          _divider(),
          _stat('Total Cr', fmt(ledger.totalCr), AppColors.success),
          _divider(),
          _stat('Closing', fmt(ledger.closingBalance), color, bold: true),
        ],
      ),
    );
  }

  Widget _stat(String label, String value, Color vColor, {bool bold = false}) => Expanded(
    child: Column(
      children: [
        Text(label,
          style: GoogleFonts.inter(fontSize: 9, color: Colors.grey.shade500, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 2),
        Text(value,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w600,
            color: vColor,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    ),
  );

  Widget _divider() => Container(
    height: 30,
    width: 1,
    color: Colors.grey.withOpacity(0.2),
    margin: const EdgeInsets.symmetric(horizontal: 4),
  );
}
