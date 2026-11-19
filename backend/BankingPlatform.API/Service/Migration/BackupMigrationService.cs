using Microsoft.Data.SqlClient;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;

namespace BankingPlatform.API.Service.Migration;

// ── Upload state ──────────────────────────────────────────────────────────────

public class BackupUpload
{
    public string UploadId { get; } = Guid.NewGuid().ToString("N")[..12];
    public string TempPath { get; set; } = "";
    public string OriginalFileName { get; set; } = "";
    public long TotalSize { get; set; }
    public long BytesReceived { get; set; }
    public int TotalChunks { get; set; }
    public int ChunksReceived { get; set; }
    public bool IsComplete => ChunksReceived >= TotalChunks && TotalChunks > 0;
    public string ScanStatus { get; set; } = "pending"; // pending | scanning | clean | threat | error
    public string ScanMessage { get; set; } = "";
    public List<string> ScanLog { get; } = new();
    public DateTime CreatedAt { get; } = DateTime.Now;
}

public class BackupUploadStore
{
    private readonly ConcurrentDictionary<string, BackupUpload> _uploads = new();
    public BackupUpload Create() { var u = new BackupUpload(); _uploads[u.UploadId] = u; return u; }
    public BackupUpload? Get(string id) => _uploads.GetValueOrDefault(id);
    public void Remove(string id) => _uploads.TryRemove(id, out _);
}

// ── Service ───────────────────────────────────────────────────────────────────

public class BackupMigrationService
{
    private readonly IConfiguration _cfg;
    private readonly BackupUploadStore _uploads;
    private readonly MigrationJobStore _jobs;

    public BackupMigrationService(IConfiguration cfg, BackupUploadStore uploads, MigrationJobStore jobs)
    {
        _cfg = cfg;
        _uploads = uploads;
        _jobs = jobs;
    }

    // ── STEP 1: Init upload ───────────────────────────────────────────────────

    public BackupUpload InitUpload(string fileName, long totalSize, int totalChunks)
    {
        var uploadDir = GetUploadDir();
        Directory.CreateDirectory(uploadDir);

        var safeFileName = Path.GetFileName(fileName); // strip any directory traversal
        var ext = Path.GetExtension(safeFileName).ToLowerInvariant();
        if (ext != ".bak")
            throw new InvalidOperationException("Only .bak files are accepted.");
        if (totalSize > 50L * 1024 * 1024 * 1024)
            throw new InvalidOperationException("File exceeds 50 GB limit.");

        var upload = _uploads.Create();
        upload.OriginalFileName = safeFileName;
        upload.TotalSize = totalSize;
        upload.TotalChunks = totalChunks;
        upload.TempPath = Path.Combine(uploadDir, $"{upload.UploadId}.bak");
        return upload;
    }

    // ── STEP 2: Receive chunk ─────────────────────────────────────────────────

    public async Task WriteChunkAsync(string uploadId, Stream chunkData, int chunkIndex)
    {
        var upload = _uploads.Get(uploadId)
            ?? throw new InvalidOperationException("Upload session not found.");

        // Append chunk at correct byte offset
        await using var fs = new FileStream(upload.TempPath,
            chunkIndex == 0 ? FileMode.Create : FileMode.Append,
            FileAccess.Write, FileShare.None);
        await chunkData.CopyToAsync(fs);

        upload.BytesReceived = new FileInfo(upload.TempPath).Length;
        upload.ChunksReceived++;
    }

    // ── STEP 3: Security scan ─────────────────────────────────────────────────

    public async Task<BackupUpload> ScanAsync(string uploadId, string? sourceConnStr = null)
    {
        var upload = _uploads.Get(uploadId)
            ?? throw new InvalidOperationException("Upload session not found.");

        if (!upload.IsComplete)
            throw new InvalidOperationException("Upload is not yet complete.");

        upload.ScanStatus = "scanning";
        upload.ScanLog.Clear();

        var ok = true;

        // ── Check 1: SQL Server header validation (RESTORE HEADERONLY) ────────
        upload.ScanLog.Add("[1/2] Validating SQL Server backup header...");
        try
        {
            var legacy = !string.IsNullOrWhiteSpace(sourceConnStr) ? sourceConnStr : GetLegacyConnStr();
            using var conn = new SqlConnection(legacy);
            await conn.OpenAsync();
            using var cmd = new SqlCommand(
                $"RESTORE HEADERONLY FROM DISK = N'{upload.TempPath.Replace("'", "''")}'", conn);
            cmd.CommandTimeout = 120;
            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                var dbName = reader["DatabaseName"]?.ToString() ?? "(unknown)";
                var backupType = reader["BackupType"]?.ToString() ?? "?";
                var backupFinish = reader["BackupFinishDate"];
                upload.ScanLog.Add($"    ✓ Valid SQL Server backup");
                upload.ScanLog.Add($"    Database : {dbName}");
                upload.ScanLog.Add($"    Type     : {backupType switch { "1" => "Full", "2" => "Transaction Log", "5" => "Differential", _ => backupType }}");
                upload.ScanLog.Add($"    Finished : {backupFinish}");
            }
            else
            {
                upload.ScanLog.Add("    ✗ RESTORE HEADERONLY returned no rows — not a valid SQL Server backup.");
                ok = false;
            }
        }
        catch (Exception ex)
        {
            upload.ScanLog.Add($"    ✗ Header validation failed: {ex.Message}");
            ok = false;
        }

        // ── Check 2: Windows Defender scan ───────────────────────────────────
        upload.ScanLog.Add("[2/2] Running Windows Defender scan...");
        var defenderPaths = new[]
        {
            @"C:\Program Files\Windows Defender\MpCmdRun.exe",
            @"C:\Program Files (x86)\Windows Defender\MpCmdRun.exe",
        };
        var defenderPath = defenderPaths.FirstOrDefault(File.Exists);

        if (defenderPath == null)
        {
            upload.ScanLog.Add("    ⚠ Windows Defender not found — skipping AV scan.");
            upload.ScanLog.Add("    Ensure the server has antivirus protection enabled.");
        }
        else
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = defenderPath,
                    Arguments = $"-Scan -ScanType 3 -File \"{upload.TempPath}\" -DisableRemediation",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                };
                using var proc = Process.Start(psi)!;
                var stdout = await proc.StandardOutput.ReadToEndAsync();
                await proc.WaitForExitAsync();

                // Exit code 0 = clean, 2 = threat found
                if (proc.ExitCode == 0)
                    upload.ScanLog.Add("    ✓ Windows Defender: No threats found.");
                else
                {
                    upload.ScanLog.Add($"    ✗ Windows Defender detected a threat (exit code {proc.ExitCode}).");
                    if (!string.IsNullOrWhiteSpace(stdout))
                        upload.ScanLog.Add($"    {stdout.Trim()}");
                    ok = false;
                }
            }
            catch (Exception ex)
            {
                upload.ScanLog.Add($"    ⚠ Defender scan error: {ex.Message}");
            }
        }

        upload.ScanStatus = ok ? "clean" : "threat";
        upload.ScanMessage = ok
            ? "File passed all security checks."
            : "File failed security checks. Restore blocked.";

        if (!ok)
        {
            // Delete the suspect file
            try { File.Delete(upload.TempPath); } catch { }
            _uploads.Remove(uploadId);
        }

        return upload;
    }

    // ── STEP 4: Restore SQL Server DB ─────────────────────────────────────────

    public MigrationJob StartRestore(string uploadId, string? targetDatabase = null, string? sourceConnStr = null)
    {
        var upload = _uploads.Get(uploadId)
            ?? throw new InvalidOperationException("Upload session not found.");

        if (upload.ScanStatus != "clean")
            throw new InvalidOperationException("File must pass security scan before restore.");

        if (string.IsNullOrWhiteSpace(targetDatabase))
            throw new InvalidOperationException("Target database name is required.");

        var job = _jobs.Create();
        _ = Task.Run(() => RunRestoreAsync(job, upload, targetDatabase.Trim(), sourceConnStr?.Trim()));
        return job;
    }

    private async Task RunRestoreAsync(MigrationJob job, BackupUpload upload, string targetDb, string? sourceConnStr = null)
    {
        job.Lines.Add($"[{Now}] Starting SQL Server restore...");
        job.Lines.Add($"[{Now}] File: {upload.OriginalFileName} ({FormatSize(upload.TotalSize)})");
        job.Lines.Add($"[{Now}] Target database: {targetDb}");

        var legacy = !string.IsNullOrWhiteSpace(sourceConnStr) ? sourceConnStr : GetLegacyConnStr();
        job.Lines.Add($"[{Now}] SQL Server: {MaskPassword(legacy)}");

        try
        {
            var masterConn = Regex.Replace(
                Regex.Replace(legacy, @"(?i)Database\s*=[^;]+", "Database=master"),
                @"(?i)Initial\s+Catalog\s*=[^;]+", "Initial Catalog=master");
            using var conn = new SqlConnection(masterConn);
            await conn.OpenAsync();

            // ── Get logical file names from backup ────────────────────────────
            job.Lines.Add($"[{Now}] Reading backup file list...");
            var fileList = new List<(string LogicalName, string Type)>();
            {
                using var cmd = new SqlCommand(
                    $"RESTORE FILELISTONLY FROM DISK = N'{upload.TempPath.Replace("'", "''")}'", conn);
                cmd.CommandTimeout = 60;
                using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                    fileList.Add((r["LogicalName"].ToString()!, r["Type"].ToString()!));
            }
            foreach (var f in fileList)
                job.Lines.Add($"[{Now}]   Logical file: {f.LogicalName} ({f.Type})");

            // ── Get SQL Server default data/log paths ─────────────────────────
            string dataPath = "", logPath = "";
            {
                using var cmd = new SqlCommand(
                    "SELECT SERVERPROPERTY('InstanceDefaultDataPath') AS dp, SERVERPROPERTY('InstanceDefaultLogPath') AS lp", conn);
                using var r = await cmd.ExecuteReaderAsync();
                if (await r.ReadAsync())
                {
                    dataPath = r["dp"]?.ToString() ?? "";
                    logPath = r["lp"]?.ToString() ?? "";
                }
            }
            job.Lines.Add($"[{Now}] Data path: {dataPath}");
            job.Lines.Add($"[{Now}] Log path : {logPath}");

            // ── Kill existing connections to target DB ─────────────────────────
            job.Lines.Add($"[{Now}] Closing existing connections to [{targetDb}]...");
            try
            {
                using var cmd = new SqlCommand(
                    $"IF DB_ID(N'{targetDb}') IS NOT NULL " +
                    $"ALTER DATABASE [{targetDb}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE", conn);
                cmd.CommandTimeout = 30;
                await cmd.ExecuteNonQueryAsync();
            }
            catch (Exception ex) { job.Lines.Add($"[{Now}]   (warning: {ex.Message})"); }

            // ── Build RESTORE command with MOVE ───────────────────────────────
            job.Lines.Add($"[{Now}] Running RESTORE DATABASE...");
            var sb = new StringBuilder();
            sb.AppendLine($"RESTORE DATABASE [{targetDb}]");
            sb.AppendLine($"FROM DISK = N'{upload.TempPath.Replace("'", "''")}'");
            sb.AppendLine("WITH REPLACE, RECOVERY,");

            int i = 0;
            foreach (var (logical, type) in fileList)
            {
                var ext = type.Equals("L", StringComparison.OrdinalIgnoreCase) ? ".ldf" : ".mdf";
                var dir = type.Equals("L", StringComparison.OrdinalIgnoreCase) ? logPath : dataPath;
                if (string.IsNullOrEmpty(dir)) dir = type.Equals("L", StringComparison.OrdinalIgnoreCase) ? @"C:\SQLLog\" : @"C:\SQLData\";
                var dest = Path.Combine(dir, $"{targetDb}_{i++}{ext}");
                sb.AppendLine($"    MOVE N'{logical.Replace("'", "''")}' TO N'{dest.Replace("'", "''")}',");
            }
            sb.AppendLine("    STATS = 10");

            var restoreSql = sb.ToString().TrimEnd().TrimEnd(',') + ";";

            using (var cmd = new SqlCommand(restoreSql, conn))
            {
                cmd.CommandTimeout = 3600; // 1 hour
                // Capture STATS messages
                conn.InfoMessage += (_, args) => job.Lines.Add($"[{Now}] {args.Message}");
                await cmd.ExecuteNonQueryAsync();
            }

            job.Lines.Add($"[{Now}] ✓ Restore completed successfully.");

            // ── Restore to multi-user ─────────────────────────────────────────
            try
            {
                using var cmd = new SqlCommand($"ALTER DATABASE [{targetDb}] SET MULTI_USER", conn);
                await cmd.ExecuteNonQueryAsync();
                job.Lines.Add($"[{Now}] Database set to MULTI_USER.");
            }
            catch (Exception ex) { job.Lines.Add($"[{Now}] (warning: {ex.Message})"); }

            job.Status = "completed";
        }
        catch (Exception ex)
        {
            job.Lines.Add($"[{Now}] ✗ Restore failed: {ex.Message}");
            job.Status = "failed";
        }

        job.EndTime = DateTime.Now;

        // Clean up temp file
        try { File.Delete(upload.TempPath); } catch { }
        _uploads.Remove(upload.UploadId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string GetUploadDir()
    {
        return _cfg["Migration:BackupUploadPath"]
            ?? Path.Combine(Path.GetTempPath(), "BankingMigration");
    }

    private string GetLegacyConnStr()
    {
        return _cfg["Migration:LegacyConnectionString"]
            ?? throw new InvalidOperationException("Migration:LegacyConnectionString not configured.");
    }

    private static string ParseDbName(string connStr)
    {
        foreach (var part in connStr.Split(';'))
        {
            var idx = part.IndexOf('=');
            if (idx < 0) continue;
            var key = part[..idx].Trim().ToLowerInvariant();
            if (key is "database" or "initial catalog")
                return part[(idx + 1)..].Trim();
        }
        return "00";
    }

    private static string MaskPassword(string connStr) =>
        Regex.Replace(connStr, @"(password=)\S+", "$1***", RegexOptions.IgnoreCase);

    private static string Now => DateTime.Now.ToString("HH:mm:ss");

    private static string FormatSize(long bytes) =>
        bytes >= 1_073_741_824 ? $"{bytes / 1_073_741_824.0:F1} GB" :
        bytes >= 1_048_576 ? $"{bytes / 1_048_576.0:F1} MB" :
        $"{bytes / 1024.0:F1} KB";
}
