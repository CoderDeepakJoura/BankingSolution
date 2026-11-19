using BankingPlatform.API.Service.Migration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class MigrationController : ControllerBase
{
    private readonly MigrationService _svc;
    private readonly MigrationJobStore _jobs;
    private readonly BackupMigrationService _backup;

    public MigrationController(MigrationService svc, MigrationJobStore jobs, BackupMigrationService backup)
    {
        _svc = svc;
        _jobs = jobs;
        _backup = backup;
    }

    // ── Table comparison ──────────────────────────────────────────────────────

    [HttpGet("compare")]
    public async Task<IActionResult> Compare()
    {
        try
        {
            var rows = await _svc.GetComparisonAsync();
            return Ok(new { success = true, data = rows });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ── Run migration ─────────────────────────────────────────────────────────

    [HttpPost("run")]
    public IActionResult Run([FromBody] RunMigrationDto dto)
    {
        if (dto.Tables == null || dto.Tables.Count == 0)
            return BadRequest(new { success = false, message = "No tables selected." });
        var job = _svc.StartMigration(dto.Tables, dto.TargetPgConnStr?.Trim());
        return Ok(new { success = true, jobId = job.JobId });
    }

    // ── Job status ────────────────────────────────────────────────────────────

    [HttpGet("job/{jobId}")]
    public IActionResult GetJob(string jobId)
    {
        var job = _jobs.Get(jobId);
        if (job == null) return NotFound(new { success = false, message = "Job not found." });
        return Ok(new
        {
            success = true,
            status = job.Status,
            lines = job.Lines,
            startTime = job.StartTime,
            endTime = job.EndTime
        });
    }

    // ── Backup restore: init upload ───────────────────────────────────────────

    [HttpPost("backup/init")]
    public IActionResult BackupInit([FromBody] InitUploadDto dto)
    {
        try
        {
            var upload = _backup.InitUpload(dto.FileName, dto.TotalSize, dto.TotalChunks);
            return Ok(new { success = true, uploadId = upload.UploadId });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ── Backup restore: upload chunk ──────────────────────────────────────────

    [HttpPost("backup/chunk")]
    [DisableRequestSizeLimit]
    [RequestFormLimits(MultipartBodyLengthLimit = long.MaxValue)]
    public async Task<IActionResult> BackupChunk(
        [FromQuery] string uploadId,
        [FromQuery] int chunkIndex)
    {
        try
        {
            await _backup.WriteChunkAsync(uploadId, Request.Body, chunkIndex);
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ── Backup restore: upload status ─────────────────────────────────────────

    [HttpGet("backup/status/{uploadId}")]
    public IActionResult BackupStatus(string uploadId)
    {
        var store = HttpContext.RequestServices.GetRequiredService<BackupUploadStore>();
        var upload = store.Get(uploadId);
        if (upload == null) return NotFound(new { success = false, message = "Upload not found." });
        return Ok(new
        {
            success = true,
            isComplete = upload.IsComplete,
            chunksReceived = upload.ChunksReceived,
            totalChunks = upload.TotalChunks,
            bytesReceived = upload.BytesReceived,
            totalSize = upload.TotalSize,
        });
    }

    // ── Backup restore: scan ──────────────────────────────────────────────────

    [HttpPost("backup/scan/{uploadId}")]
    public async Task<IActionResult> BackupScan(string uploadId, [FromBody] ScanDto? dto = null)
    {
        try
        {
            var upload = await _backup.ScanAsync(uploadId, dto?.SourceConnStr?.Trim());
            return Ok(new
            {
                success = true,
                scanStatus = upload.ScanStatus,
                scanMessage = upload.ScanMessage,
                scanLog = upload.ScanLog,
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ── Backup restore: restore DB ────────────────────────────────────────────

    [HttpPost("backup/restore/{uploadId}")]
    public IActionResult BackupRestore(string uploadId, [FromBody] RestoreDbDto dto)
    {
        try
        {
            var job = _backup.StartRestore(uploadId, dto.TargetDatabase?.Trim(), dto.SourceConnStr?.Trim());
            return Ok(new { success = true, jobId = job.JobId });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}

public record ScanDto(string? SourceConnStr);

public record RestoreDbDto(string? TargetDatabase, string? SourceConnStr);

public record InitUploadDto(string FileName, long TotalSize, int TotalChunks);
