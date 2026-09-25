using System.Runtime.CompilerServices;

[assembly: InternalsVisibleTo("BankingPlatform.Tests")]

namespace BankingPlatform.API.Common.CommonFunctions;

/// <summary>
/// Holds a reserved voucher number and the branch semaphore that was acquired
/// to prevent duplicate voucher numbers under concurrent requests.
///
/// Dispose (via `using`) AFTER SaveChangesAsync() so the semaphore is released
/// only once the voucher row is safely committed to the database.
/// </summary>
public sealed class VoucherNumberLease : IDisposable
{
    public int VoucherNo { get; }

    private readonly SemaphoreSlim _semaphore;
    private bool _disposed;

    internal VoucherNumberLease(int voucherNo, SemaphoreSlim semaphore)
    {
        VoucherNo = voucherNo;
        _semaphore = semaphore;
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            _semaphore.Release();
            _disposed = true;
        }
    }
}
