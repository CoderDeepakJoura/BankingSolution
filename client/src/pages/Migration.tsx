import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiDatabase, FiRefreshCw, FiPlay,
  FiCheckCircle, FiAlertTriangle, FiXCircle,
  FiUploadCloud, FiShield, FiHardDrive, FiArrowRight,
} from 'react-icons/fi';
import { migrationApi, type TableComparison, type MigrationJob, type ScanResult } from '../services/migrationApi';

type Tab = 'restore' | 'sync';

// ── Shared log display ────────────────────────────────────────────────────────
function LogPanel({ job, running, label }: { job: MigrationJob | null; running: boolean; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [job?.lines]);
  const color = job?.status === 'completed' ? 'text-green-400' : job?.status === 'failed' ? 'text-red-400' : 'text-yellow-400';
  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="bg-slate-700 px-4 py-2.5 flex items-center gap-3">
        <span className="text-white font-semibold text-sm">{label ?? 'Output'}</span>
        {job && <span className={`text-sm font-bold uppercase ${color}`}>{job.status}</span>}
        {running && !job && <span className="text-yellow-400 text-sm animate-pulse">Starting...</span>}
        {job?.endTime && (
          <span className="ml-auto text-slate-400 text-xs">
            {((new Date(job.endTime).getTime() - new Date(job.startTime).getTime()) / 1000).toFixed(1)}s
          </span>
        )}
      </div>
      <div ref={ref} className="bg-slate-900 font-mono text-xs p-4 h-64 overflow-y-auto space-y-0.5">
        {job?.lines.map((line, i) => (
          <div key={i} className={
            line.includes('✗') || line.includes('ERROR') ? 'text-red-400' :
            line.includes('✓') || line.includes('completed') ? 'text-green-300' :
            line.includes('===') || line.includes('SUMM') ? 'text-cyan-300 font-semibold' :
            line.includes('⚠') || line.includes('WARN') || line.includes('warning') ? 'text-yellow-400' :
            line.startsWith('[') ? 'text-slate-400' : 'text-green-300'
          }>{line}</div>
        ))}
        {running && (!job || job.status === 'running') && <div className="text-yellow-400 animate-pulse">▌</div>}
      </div>
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────
function Step({ n, label, status }: { n: number; label: string; status: 'done' | 'active' | 'pending' }) {
  return (
    <div className={`flex items-center gap-2 ${status === 'pending' ? 'opacity-40' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
        status === 'done' ? 'bg-green-600 text-white' :
        status === 'active' ? 'bg-indigo-600 text-white' :
        'bg-slate-700 text-slate-400'
      }`}>
        {status === 'done' ? <FiCheckCircle size={14} /> : n}
      </div>
      <span className={`text-sm font-medium ${status === 'active' ? 'text-white' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

// ── Connection settings panel ─────────────────────────────────────────────────
function ConnSettings({
  ssConnStr, setSsConnStr, pgConnStr, setPgConnStr, collapsed, setCollapsed,
}: {
  ssConnStr: string; setSsConnStr: (v: string) => void;
  pgConnStr: string; setPgConnStr: (v: string) => void;
  collapsed: boolean; setCollapsed: (v: boolean) => void;
}) {
  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-slate-300 font-medium text-sm">
          <FiDatabase size={15} />
          <span>Connection Settings</span>
          <span className="text-slate-500 font-normal">(SQL Server source · PostgreSQL target)</span>
        </div>
        <span className="text-slate-500 text-xs">{collapsed ? '▼ expand' : '▲ collapse'}</span>
      </button>
      {!collapsed && (
        <div className="px-5 pb-5 space-y-3 border-t border-slate-700">
          <div className="grid md:grid-cols-2 gap-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-slate-300 text-sm font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                SQL Server (source / restore target)
              </label>
              <input
                type="text" value={ssConnStr} onChange={e => setSsConnStr(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-orange-500 placeholder:text-slate-600"
                placeholder="Server=localhost;Database=00;Trusted_Connection=True;TrustServerCertificate=True;"
              />
              <p className="text-slate-500 text-xs">Windows machine where the .bak will be restored. Needs SQL Server access.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-300 text-sm font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                PostgreSQL (migration destination)
              </label>
              <input
                type="text" value={pgConnStr} onChange={e => setPgConnStr(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
                placeholder="host=150.241.244.121 dbname=KrishnaDBFinal user=postgres password=..."
              />
              <p className="text-slate-500 text-xs">Linux PostgreSQL server where data will be migrated after restore.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// BACKUP RESTORE TAB
// ═════════════════════════════════════════════════════════════════════════════
function BackupRestoreTab({
  ssConnStr, setSsConnStr, pgConnStr, setPgConnStr,
}: {
  ssConnStr: string; setSsConnStr: (v: string) => void;
  pgConnStr: string; setPgConnStr: (v: string) => void;
}) {
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const [targetDb, setTargetDb] = useState('');
  const [restoreJob, setRestoreJob] = useState<MigrationJob | null>(null);
  const [restoring, setRestoring] = useState(false);
  const restorePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (restorePollRef.current) clearInterval(restorePollRef.current); }, []);

  const fmtSize = (b: number) =>
    b >= 1_073_741_824 ? `${(b / 1_073_741_824).toFixed(1)} GB` :
    b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${(b / 1024).toFixed(1)} KB`;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.bak')) {
      alert('Only .bak files are accepted.');
      return;
    }
    setFileName(file.name);
    setFileSize(fmtSize(file.size));
    setUploading(true);
    setUploadDone(false);
    setUploadPct(0);
    setScanResult(null);
    setRestoreJob(null);
    try {
      const id = await migrationApi.uploadBackup(file, (pct) => setUploadPct(pct));
      setUploadId(id);
      setUploadDone(true);
    } catch (err: any) {
      alert('Upload failed: ' + (err?.message ?? 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const handleScan = async () => {
    if (!uploadId) return;
    if (!ssConnStr.trim()) { alert('Enter a SQL Server connection string before scanning.'); return; }
    setScanning(true);
    setScanResult(null);
    try {
      const result = await migrationApi.scanBackup(uploadId, ssConnStr.trim());
      setScanResult(result);
    } catch (err: any) {
      alert('Scan failed: ' + (err?.message ?? 'Unknown error'));
    } finally {
      setScanning(false);
    }
  };

  const handleRestore = async () => {
    if (!uploadId || !scanResult || scanResult.scanStatus !== 'clean') return;
    if (!targetDb.trim()) { alert('Enter the target database name before restoring.'); return; }
    if (!ssConnStr.trim()) { alert('Enter a SQL Server connection string.'); return; }
    if (!confirm(`Restore to SQL Server database "${targetDb.trim()}"?\n\nThis will overwrite the existing database with that name.`)) return;
    setRestoring(true);
    setRestoreJob(null);
    try {
      const jobId = await migrationApi.restoreBackup(uploadId, targetDb.trim(), ssConnStr.trim());
      restorePollRef.current = setInterval(async () => {
        const j = await migrationApi.getJob(jobId);
        setRestoreJob(j);
        if (j.status !== 'running') {
          if (restorePollRef.current) clearInterval(restorePollRef.current);
          setRestoring(false);
        }
      }, 2000);
    } catch (err: any) {
      alert('Restore failed: ' + (err?.message ?? 'Unknown error'));
      setRestoring(false);
    }
  };

  const step = !uploadDone ? 1 : !scanResult ? 2 : scanResult.scanStatus !== 'clean' ? 2 : !restoreJob ? 3 : 4;

  return (
    <div className="space-y-5">
      {/* Architecture note */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl px-5 py-3 text-sm text-blue-200 leading-relaxed">
        <strong className="text-blue-300">How it works:</strong>&nbsp;
        The .bak file (SQL Server backup from Windows) is uploaded &amp; scanned, then restored to the SQL Server you specify above.
        After restore, the <strong>Table Sync</strong> tab runs <code className="bg-blue-900/40 px-1 rounded text-xs">migrate.py</code> to
        copy data from that SQL Server into the PostgreSQL destination.
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-4 flex-wrap bg-slate-800/50 rounded-xl px-5 py-4">
        <Step n={1} label="Upload Backup" status={uploadDone ? 'done' : step === 1 ? 'active' : 'pending'} />
        <FiArrowRight className="text-slate-600 shrink-0" />
        <Step n={2} label="Security Scan" status={scanResult?.scanStatus === 'clean' ? 'done' : step === 2 ? 'active' : 'pending'} />
        <FiArrowRight className="text-slate-600 shrink-0" />
        <Step n={3} label="Restore to SQL Server" status={restoreJob?.status === 'completed' ? 'done' : step === 3 ? 'active' : 'pending'} />
        <FiArrowRight className="text-slate-600 shrink-0" />
        <Step n={4} label="Migrate to PostgreSQL" status={restoreJob?.status === 'completed' ? 'active' : 'pending'} />
      </div>

      {/* Step 1: Upload */}
      <div className="bg-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold">
          <FiUploadCloud size={18} />
          <span>Step 1: Upload .bak File</span>
        </div>
        <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          uploading ? 'border-indigo-500 bg-indigo-900/10' : 'border-slate-600 hover:border-indigo-500 bg-slate-900/30 hover:bg-indigo-900/10'
        }`}>
          <FiUploadCloud size={28} className="text-slate-400 mb-2" />
          <span className="text-slate-400 text-sm">
            {uploading ? `Uploading... ${uploadPct}%` : uploadDone ? `✓ ${fileName}` : 'Click or drag a .bak file here'}
          </span>
          {uploadDone && <span className="text-slate-500 text-xs mt-1">{fileSize}</span>}
          <input type="file" accept=".bak" className="hidden" onChange={handleFileChange} disabled={uploading} />
        </label>

        {/* Progress bar */}
        {(uploading || uploadDone) && (
          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${uploadDone ? 'bg-green-500' : 'bg-indigo-500'}`}
              style={{ width: `${uploadPct}%` }}
            />
          </div>
        )}
        {uploading && (
          <p className="text-slate-400 text-sm text-center">{uploadPct}% — uploading in 10 MB chunks</p>
        )}
      </div>

      {/* Step 2: Scan */}
      {uploadDone && (
        <div className="bg-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-semibold">
              <FiShield size={18} />
              <span>Step 2: Security Scan</span>
            </div>
            <button onClick={handleScan} disabled={scanning || !!scanResult}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
              {scanning ? <><FiRefreshCw size={14} className="animate-spin" /> Scanning...</> : <><FiShield size={14} /> Run Scan</>}
            </button>
          </div>

          {scanResult && (
            <div className={`rounded-lg p-4 space-y-3 ${scanResult.scanStatus === 'clean' ? 'bg-green-900/20 border border-green-700' : 'bg-red-900/20 border border-red-700'}`}>
              <div className={`flex items-center gap-2 font-semibold ${scanResult.scanStatus === 'clean' ? 'text-green-400' : 'text-red-400'}`}>
                {scanResult.scanStatus === 'clean' ? <FiCheckCircle size={16} /> : <FiXCircle size={16} />}
                {scanResult.scanMessage}
              </div>
              <div className="bg-slate-900 rounded p-3 font-mono text-xs space-y-0.5">
                {scanResult.scanLog.map((line, i) => (
                  <div key={i} className={
                    line.includes('✓') ? 'text-green-400' :
                    line.includes('✗') ? 'text-red-400' :
                    line.includes('⚠') ? 'text-yellow-400' :
                    line.startsWith('[') ? 'text-cyan-300 font-semibold' : 'text-slate-300'
                  }>{line}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Restore */}
      {scanResult?.scanStatus === 'clean' && (
        <div className="bg-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-semibold">
              <FiHardDrive size={18} />
              <span>Step 3: Restore to SQL Server</span>
            </div>
            <button onClick={handleRestore} disabled={restoring || restoreJob?.status === 'completed'}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
              {restoring ? <><FiRefreshCw size={14} className="animate-spin" /> Restoring...</> : <><FiHardDrive size={14} /> Start Restore</>}
            </button>
          </div>
          <div className="flex flex-col gap-1.5 max-w-sm">
            <label className="text-slate-300 text-sm font-medium">Target Database Name <span className="text-slate-500 font-normal">(on SQL Server above)</span></label>
            <input
              type="text"
              value={targetDb}
              onChange={e => setTargetDb(e.target.value)}
              placeholder="e.g. 00"
              disabled={restoring || restoreJob?.status === 'completed'}
              className="bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-50 placeholder:text-slate-600"
            />
            <p className="text-slate-500 text-xs">
              Created if it doesn't exist, overwritten if it does. The SQL Server connection is from Connection Settings above.
            </p>
          </div>
          {(restoreJob || restoring) && (
            <LogPanel job={restoreJob} running={restoring} label="Restore Output" />
          )}
        </div>
      )}

      {/* Step 4: Go to migration */}
      {restoreJob?.status === 'completed' && (
        <div className="bg-green-900/20 border border-green-700 rounded-xl p-5 flex items-center justify-between">
          <div>
            <div className="text-green-400 font-semibold flex items-center gap-2">
              <FiCheckCircle size={16} /> Restore Complete
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Switch to the Table Sync tab to run the migration to PostgreSQL.
            </p>
          </div>
          <FiArrowRight className="text-green-400" size={24} />
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TABLE SYNC TAB
// ═════════════════════════════════════════════════════════════════════════════
function TableSyncTab({ pgConnStr }: { pgConnStr: string }) {
  const [rows, setRows] = useState<TableComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'missing' | 'partial' | 'synced'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [job, setJob] = useState<MigrationJob | null>(null);
  const [running, setRunning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadComparison = useCallback(async () => {
    setLoading(true);
    try {
      const data = await migrationApi.compare();
      setRows(data);
      setSelected(new Set(data.filter(r => r.status !== 'synced').map(r => r.ssTable)));
    } catch (e: any) {
      alert('Failed to load comparison: ' + (e?.message ?? 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadComparison(); }, [loadComparison]);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const categories = ['all', ...Array.from(new Set(rows.map(r => r.category))).sort()];
  const visible = rows.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;
    return true;
  });

  const toggleRow = (k: string) => setSelected(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleVisible = () => {
    const all = visible.every(r => selected.has(r.ssTable));
    setSelected(prev => { const n = new Set(prev); visible.forEach(r => all ? n.delete(r.ssTable) : n.add(r.ssTable)); return n; });
  };

  const startMigration = async () => {
    if (selected.size === 0) { alert('Select at least one table.'); return; }
    if (!confirm(`Migrate ${selected.size} table(s) to PostgreSQL?\n\nTarget: ${pgConnStr || '(default from appsettings)'}\n\nExisting rows are skipped (ON CONFLICT DO NOTHING).`)) return;
    setRunning(true); setJob(null);
    try {
      const id = await migrationApi.run([...selected], pgConnStr || undefined);
      pollRef.current = setInterval(async () => {
        const j = await migrationApi.getJob(id);
        setJob(j);
        if (j.status !== 'running') {
          if (pollRef.current) clearInterval(pollRef.current);
          setRunning(false);
          loadComparison();
        }
      }, 2000);
    } catch (e: any) {
      alert('Failed: ' + (e?.message ?? 'Unknown error'));
      setRunning(false);
    }
  };

  const synced = rows.filter(r => r.status === 'synced').length;
  const partial = rows.filter(r => r.status === 'partial').length;
  const missing = rows.filter(r => r.status === 'missing').length;
  const totalGap = rows.reduce((s, r) => s + r.gap, 0);

  const statusBadge = (s: string) => {
    const cls = s === 'synced' ? 'bg-green-100 text-green-700' : s === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${cls}`}>{s}</span>;
  };
  const statusIcon = (s: string) =>
    s === 'synced' ? <FiCheckCircle className="text-green-500" /> :
    s === 'partial' ? <FiAlertTriangle className="text-yellow-500" /> :
    <FiXCircle className="text-red-500" />;

  return (
    <div className="space-y-4">
      {/* Summary */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Synced', value: synced, color: 'text-green-400', bg: 'bg-green-900/20' },
            { label: 'Partial', value: partial, color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
            { label: 'Missing', value: missing, color: 'text-red-400', bg: 'bg-red-900/20' },
            { label: 'Total Gap', value: totalGap.toLocaleString(), color: 'text-orange-400', bg: 'bg-orange-900/20' },
          ].map(c => (
            <div key={c.label} className={`${c.bg} rounded-xl p-4 text-center`}>
              <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-slate-400 text-xs mt-1">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={loadComparison} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        <button onClick={startMigration} disabled={running || selected.size === 0 || loading}
          className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
          <FiPlay size={15} />
          {running ? 'Running...' : `Migrate Selected (${selected.size})`}
        </button>
        <button onClick={() => setSelected(new Set(rows.filter(r => r.status !== 'synced').map(r => r.ssTable)))}
          className="text-indigo-300 hover:text-white text-sm underline">
          Select Missing/Partial
        </button>
        <button onClick={toggleVisible} className="text-slate-400 hover:text-white text-sm underline">
          Toggle Visible
        </button>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
            className="bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 border border-slate-600 cursor-pointer">
            <option value="all">All Status</option>
            <option value="missing">Missing</option>
            <option value="partial">Partial</option>
            <option value="synced">Synced</option>
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 border border-slate-600 cursor-pointer">
            {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
          </select>
          <span className="text-slate-500 text-sm">{visible.length} / {rows.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-700 text-slate-300">
                <th className="p-3 text-left w-10">
                  <input type="checkbox"
                    checked={visible.length > 0 && visible.every(r => selected.has(r.ssTable))}
                    onChange={toggleVisible} className="cursor-pointer" />
                </th>
                <th className="p-3 text-left">Table</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-right">SQL Server</th>
                <th className="p-3 text-right">PostgreSQL</th>
                <th className="p-3 text-right">Gap</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">
                  <FiRefreshCw className="animate-spin inline mr-2" />Querying both databases...
                </td></tr>
              )}
              {!loading && visible.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-slate-500">No tables match the current filter.</td></tr>
              )}
              {!loading && visible.map(row => (
                <tr key={row.ssTable} onClick={() => toggleRow(row.ssTable)}
                  className={`border-t border-slate-700 cursor-pointer transition-colors ${selected.has(row.ssTable) ? 'bg-indigo-900/30' : 'hover:bg-slate-700/40'}`}>
                  <td className="p-3 text-center">
                    <input type="checkbox" checked={selected.has(row.ssTable)} onChange={() => {}} className="cursor-pointer" />
                  </td>
                  <td className="p-3">
                    <div className="text-white font-medium">{row.displayName}</div>
                    <div className="text-slate-500 text-xs font-mono">{row.pgTable}</div>
                  </td>
                  <td className="p-3">
                    <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 text-xs">{row.category}</span>
                  </td>
                  <td className="p-3 text-right font-mono text-slate-300">{row.ssCount.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-slate-300">{row.pgCount.toLocaleString()}</td>
                  <td className={`p-3 text-right font-mono font-bold ${row.gap > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                    {row.gap > 0 ? `-${row.gap.toLocaleString()}` : '—'}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {statusIcon(row.status)}{statusBadge(row.status)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(job || running) && <LogPanel job={job} running={running} label="Migration Output" />}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function Migration() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('restore');
  const [ssConnStr, setSsConnStr] = useState('Server=localhost;Database=00;Trusted_Connection=True;TrustServerCertificate=True;');
  const [pgConnStr, setPgConnStr] = useState('host=localhost dbname=krishnadbfinal user=postgres password=postgres');
  const [connCollapsed, setConnCollapsed] = useState(false);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-indigo-700 via-blue-700 to-cyan-700 px-6 py-4 flex items-center gap-3 shadow-lg">
        <button onClick={() => navigate(-1)} className="text-white hover:text-indigo-200 transition-colors">
          <FiArrowLeft size={22} />
        </button>
        <FiDatabase size={22} className="text-white" />
        <h1 className="text-white text-xl font-bold tracking-wide">Data Migration</h1>
        <span className="text-indigo-200 text-sm ml-1">SQL Server → PostgreSQL</span>
      </div>

      <div className="w-full px-6 pt-5 space-y-4">
        {/* Connection settings — always visible above both tabs */}
        <ConnSettings
          ssConnStr={ssConnStr} setSsConnStr={setSsConnStr}
          pgConnStr={pgConnStr} setPgConnStr={setPgConnStr}
          collapsed={connCollapsed} setCollapsed={setConnCollapsed}
        />

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800 rounded-xl p-1 max-w-sm">
          {([['restore', 'Backup Restore', FiHardDrive], ['sync', 'Table Sync', FiDatabase]] as const).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full p-6">
        {tab === 'restore'
          ? <BackupRestoreTab ssConnStr={ssConnStr} setSsConnStr={setSsConnStr} pgConnStr={pgConnStr} setPgConnStr={setPgConnStr} />
          : <TableSyncTab pgConnStr={pgConnStr} />}
      </div>
    </div>
  );
}
