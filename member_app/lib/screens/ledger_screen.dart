import 'dart:typed_data';
import 'package:flutter/material.dart';
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
    _fromDate = now.month >= 4 ? DateTime(now.year, 4, 1) : DateTime(now.year - 1, 4, 1);
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
      setState(() { isFrom ? _fromDate = picked : _toDate = picked; });
    }
  }

  String _fmt(double v) =>
      NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 2).format(v.abs());

  String _fmtShort(double v) =>
      NumberFormat.currency(locale: 'en_IN', symbol: '₹ ', decimalDigits: 0).format(v.abs());

  String _fmtDate(DateTime d) => DateFormat('dd-MM-yyyy').format(d);
  String _fmtDateShort(DateTime d) => DateFormat('dd-MM-yy').format(d);

  bool get _isLoan => widget.account.accountType == 'Loan';

  // ── Build ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        backgroundColor: widget.color,
        foregroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          widget.account.accountType == 'Saving' ? 'Saving Account'
              : widget.account.accountType == 'FD' ? 'Fixed Deposit'
              : widget.account.accountType == 'RD' ? 'Recurring Deposit'
              : widget.account.accountType == 'Loan' ? 'My Loan Account'
              : widget.account.accountType,
          style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16),
        ),
        actions: [
          if (_ledger != null)
            IconButton(
              icon: const Icon(Icons.download_outlined, color: Colors.white),
              tooltip: 'Download PDF',
              onPressed: _downloadPdf,
            ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            // ── Top info card ──────────────────────────────────────────────
            _buildInfoCard(),

            // ── Date pickers + search ──────────────────────────────────────
            _buildDateRow(),

            // ── Ledger table ───────────────────────────────────────────────
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? _buildError()
                      : _buildLedger(),
            ),

            // ── Download button ────────────────────────────────────────────
            if (_ledger != null && _ledger!.entries.isNotEmpty)
              _buildDownloadBtn(),
          ],
        ),
      ),
    );
  }

  // ── Info card ─────────────────────────────────────────────────────────────
  Widget _buildInfoCard() {
    final ledger = _ledger;
    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      child: Column(
        children: [
          // Account number
          Text(
            'Account No.: ${widget.account.accountIdentifier}',
            style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 4),
          Text('Available Balance',
            style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade500)),
          const SizedBox(height: 4),
          Text(
            _fmt(widget.account.balance),
            style: GoogleFonts.inter(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: _isLoan && widget.account.balance > 0
                  ? AppColors.error
                  : const Color(0xFF0D8A4E),
            ),
          ),

          // Summary stats (only once ledger is loaded)
          if (ledger != null) ...[
            const SizedBox(height: 14),
            const Divider(height: 1),
            const SizedBox(height: 12),
            Row(
              children: [
                _statBox('Opening Bal.', _fmtShort(ledger.openingBalance), Colors.grey.shade700),
                _vDivider(),
                _statBox(
                  _isLoan ? 'Total Payment' : 'Total Deposit',
                  _fmtShort(ledger.totalCr),
                  const Color(0xFF0D8A4E),
                ),
                _vDivider(),
                _statBox(
                  _isLoan ? 'Total Disbursed' : 'Total Withdrawal',
                  _fmtShort(ledger.totalDr),
                  AppColors.error,
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _statBox(String label, String value, Color color) => Expanded(
    child: Column(
      children: [
        Text(label,
          style: GoogleFonts.inter(fontSize: 10, color: Colors.grey.shade500),
          textAlign: TextAlign.center),
        const SizedBox(height: 3),
        Text(value,
          style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: color),
          textAlign: TextAlign.center,
          maxLines: 1,
          overflow: TextOverflow.ellipsis),
      ],
    ),
  );

  Widget _vDivider() => Container(width: 1, height: 32, color: Colors.grey.shade200);

  // ── Date row ──────────────────────────────────────────────────────────────
  Widget _buildDateRow() => Container(
    padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
    decoration: BoxDecoration(
      color: Colors.white,
      border: Border(top: BorderSide(color: Colors.grey.shade100)),
      boxShadow: [
        BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 4, offset: const Offset(0, 2)),
      ],
    ),
    child: Column(
      children: [
        Row(
          children: [
            Expanded(child: _DatePicker(
              label: 'From Date',
              date: _fromDate,
              color: widget.color,
              onTap: () => _pickDate(true),
            )),
            const SizedBox(width: 12),
            Expanded(child: _DatePicker(
              label: 'To Date',
              date: _toDate,
              color: widget.color,
              onTap: () => _pickDate(false),
            )),
          ],
        ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          height: 44,
          child: ElevatedButton(
            onPressed: _fetchLedger,
            style: ElevatedButton.styleFrom(
              backgroundColor: widget.color,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700),
            ),
            child: const Text('Search'),
          ),
        ),
      ],
    ),
  );

  // ── Ledger table ──────────────────────────────────────────────────────────
  Widget _buildLedger() {
    final ledger = _ledger;
    if (ledger == null || ledger.entries.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.receipt_long_outlined, size: 56, color: Colors.grey.shade300),
            const SizedBox(height: 12),
            Text('No transactions in this period',
              style: GoogleFonts.inter(color: Colors.grey.shade400, fontSize: 14)),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Table header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          color: widget.color,
          child: Row(
            children: [
              _hdr('Date', flex: 2),
              _hdr('Particulars', flex: 3),
              _hdr(_isLoan ? 'Payment' : 'Deposit', flex: 2, right: true),
              _hdr(_isLoan ? 'Disbursed' : 'Withdraw', flex: 2, right: true),
              _hdr('Balance', flex: 2, right: true),
            ],
          ),
        ),

        // Rows
        Expanded(
          child: ListView.builder(
            itemCount: ledger.entries.length,
            itemBuilder: (ctx, i) {
              final e = ledger.entries[i];
              final isEven = i.isEven;
              return Container(
                color: isEven ? Colors.white : const Color(0xFFF8FAFC),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                child: Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: Text(
                        _fmtDateShort(e.voucherDate),
                        style: GoogleFonts.inter(fontSize: 10, color: Colors.grey.shade600),
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: Text(
                        e.particulars,
                        style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF1A202C)),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        e.cr != null ? _fmtShort(e.cr!) : '-',
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          color: e.cr != null ? const Color(0xFF0D8A4E) : Colors.grey.shade400,
                          fontWeight: e.cr != null ? FontWeight.w600 : FontWeight.normal,
                        ),
                        textAlign: TextAlign.right,
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        e.dr != null ? _fmtShort(e.dr!) : '-',
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          color: e.dr != null ? AppColors.error : Colors.grey.shade400,
                          fontWeight: e.dr != null ? FontWeight.w600 : FontWeight.normal,
                        ),
                        textAlign: TextAlign.right,
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        _fmtShort(e.balance),
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF1A202C),
                        ),
                        textAlign: TextAlign.right,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _hdr(String text, {int flex = 1, bool right = false}) => Expanded(
    flex: flex,
    child: Text(
      text,
      style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 10),
      textAlign: right ? TextAlign.right : TextAlign.left,
    ),
  );

  // ── Download button ───────────────────────────────────────────────────────
  Widget _buildDownloadBtn() => Container(
    padding: EdgeInsets.fromLTRB(16, 10, 16, 16 + MediaQuery.of(context).padding.bottom),
    color: Colors.white,
    child: SizedBox(
      width: double.infinity,
      height: 46,
      child: ElevatedButton.icon(
        onPressed: _downloadPdf,
        icon: const Icon(Icons.picture_as_pdf_rounded, size: 18),
        label: const Text('Download Statement (PDF)'),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF0D8A4E),
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          textStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600),
        ),
      ),
    ),
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  Widget _buildError() => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: AppColors.error.withOpacity(0.6)),
          const SizedBox(height: 12),
          Text(_error!, textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600)),
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

  // ── PDF ───────────────────────────────────────────────────────────────────
  Future<void> _downloadPdf() async {
    if (_ledger == null) return;
    final bytes = await _buildPdf();
    await Printing.layoutPdf(onLayout: (_) => bytes);
  }

  Future<Uint8List> _buildPdf() async {
    final font = await PdfGoogleFonts.notoSansRegular();
    final fontBold = await PdfGoogleFonts.notoSansBold();
    final doc = pw.Document(theme: pw.ThemeData.withFont(base: font, bold: fontBold));
    final ledger = _ledger!;
    final dateRange =
        '${DateFormat('dd MMM yyyy').format(_fromDate)} to ${DateFormat('dd MMM yyyy').format(_toDate)}';
    final crLabel = _isLoan ? 'Payment' : 'Deposit';
    final drLabel = _isLoan ? 'Disbursed' : 'Withdraw';

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        header: (ctx) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(widget.account.accountName,
              style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 4),
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('${widget.account.accountType} — ${ledger.accountIdentifier}',
                  style: const pw.TextStyle(fontSize: 11, color: PdfColors.grey600)),
                pw.Text(dateRange,
                  style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey600)),
              ],
            ),
            pw.Divider(height: 12),
          ],
        ),
        build: (ctx) => [
          pw.Container(
            padding: const pw.EdgeInsets.symmetric(vertical: 6, horizontal: 8),
            color: PdfColors.grey100,
            child: pw.Row(children: [
              pw.Expanded(flex: 2, child: pw.Text('Opening Balance',
                style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10))),
              pw.Expanded(child: pw.SizedBox()),
              pw.Expanded(child: pw.SizedBox()),
              pw.Expanded(child: pw.Text(_fmt(ledger.openingBalance),
                style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
                textAlign: pw.TextAlign.right)),
            ]),
          ),
          pw.Container(
            color: const PdfColor.fromInt(0xFF1A56DB),
            padding: const pw.EdgeInsets.symmetric(vertical: 7, horizontal: 8),
            child: pw.Row(children: [
              pw.Expanded(flex: 1, child: _ph('Date')),
              pw.Expanded(flex: 3, child: _ph('Particulars')),
              pw.Expanded(flex: 2, child: _ph(crLabel, right: true)),
              pw.Expanded(flex: 2, child: _ph(drLabel, right: true)),
              pw.Expanded(flex: 2, child: _ph('Balance', right: true)),
            ]),
          ),
          ...ledger.entries.asMap().entries.map((e) {
            final entry = e.value;
            final bg = e.key.isEven ? PdfColors.white : PdfColors.grey50;
            return pw.Container(
              color: bg,
              padding: const pw.EdgeInsets.symmetric(vertical: 5, horizontal: 8),
              child: pw.Row(children: [
                pw.Expanded(flex: 1, child: pw.Text(_fmtDateShort(entry.voucherDate),
                  style: const pw.TextStyle(fontSize: 9))),
                pw.Expanded(flex: 3, child: pw.Text(entry.particulars,
                  style: const pw.TextStyle(fontSize: 9))),
                pw.Expanded(flex: 2, child: pw.Text(
                  entry.cr != null ? _fmt(entry.cr!) : '',
                  style: const pw.TextStyle(fontSize: 9, color: PdfColors.green700),
                  textAlign: pw.TextAlign.right)),
                pw.Expanded(flex: 2, child: pw.Text(
                  entry.dr != null ? _fmt(entry.dr!) : '',
                  style: const pw.TextStyle(fontSize: 9, color: PdfColors.red700),
                  textAlign: pw.TextAlign.right)),
                pw.Expanded(flex: 2, child: pw.Text(_fmt(entry.balance),
                  style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold),
                  textAlign: pw.TextAlign.right)),
              ]),
            );
          }),
          pw.SizedBox(height: 4),
          pw.Divider(),
          pw.Container(
            padding: const pw.EdgeInsets.symmetric(vertical: 7, horizontal: 8),
            color: PdfColors.grey100,
            child: pw.Row(children: [
              pw.Expanded(flex: 1, child: pw.SizedBox()),
              pw.Expanded(flex: 3, child: pw.Text('Closing Balance',
                style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10))),
              pw.Expanded(flex: 2, child: pw.Text(_fmt(ledger.totalCr),
                style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColors.green700),
                textAlign: pw.TextAlign.right)),
              pw.Expanded(flex: 2, child: pw.Text(_fmt(ledger.totalDr),
                style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColors.red700),
                textAlign: pw.TextAlign.right)),
              pw.Expanded(flex: 2, child: pw.Text(_fmt(ledger.closingBalance),
                style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
                textAlign: pw.TextAlign.right)),
            ]),
          ),
        ],
      ),
    );
    return doc.save();
  }

  pw.Widget _ph(String text, {bool right = false}) => pw.Text(
    text,
    style: pw.TextStyle(color: PdfColors.white, fontWeight: pw.FontWeight.bold, fontSize: 9),
    textAlign: right ? pw.TextAlign.right : pw.TextAlign.left,
  );
}

// ── Date picker widget ─────────────────────────────────────────────────────
class _DatePicker extends StatelessWidget {
  final String label;
  final DateTime date;
  final Color color;
  final VoidCallback onTap;

  const _DatePicker({
    required this.label,
    required this.date,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(8),
          color: const Color(0xFFF8FAFC),
        ),
        child: Row(
          children: [
            Icon(Icons.calendar_today_outlined, size: 14, color: color),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                  style: GoogleFonts.inter(fontSize: 9, color: Colors.grey.shade500)),
                Text(
                  DateFormat('dd-MM-yyyy').format(date),
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600,
                    color: const Color(0xFF1A202C)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
