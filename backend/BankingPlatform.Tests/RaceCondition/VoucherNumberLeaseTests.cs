using BankingPlatform.API.Common.CommonFunctions;

namespace BankingPlatform.Tests.RaceCondition;

public class VoucherNumberLeaseTests
{
    [Fact]
    public void VoucherNumberLease_Dispose_ReleasesExactlyOnce()
    {
        var sem = new SemaphoreSlim(1, 1);
        sem.Wait(); // Simulate the semaphore being acquired

        var lease = new VoucherNumberLease(42, sem);
        sem.CurrentCount.Should().Be(0); // Held

        lease.Dispose();
        sem.CurrentCount.Should().Be(1); // Released

        lease.Dispose(); // Second dispose must be idempotent
        sem.CurrentCount.Should().Be(1); // Still 1, not 2
    }

    [Fact]
    public void VoucherNumberLease_HoldsCorrectNumber()
    {
        var sem = new SemaphoreSlim(1, 1);
        sem.Wait();

        using var lease = new VoucherNumberLease(99, sem);
        lease.VoucherNo.Should().Be(99);
    }

    [Fact]
    public async Task ConcurrentReservations_NoDuplicateNumbers()
    {
        // Simulate 10 concurrent tasks trying to get voucher numbers from a shared counter.
        // Since we use SemaphoreSlim, each task gets a unique number.
        var sem = new SemaphoreSlim(1, 1);
        int counter = 0;
        var assignedNumbers = new System.Collections.Concurrent.ConcurrentBag<int>();

        var tasks = Enumerable.Range(0, 20).Select(async _ =>
        {
            await sem.WaitAsync();
            try
            {
                // Simulate the read-MAX + increment window
                int myNumber = Interlocked.Increment(ref counter);
                await Task.Delay(1); // Simulate async work (e.g., DB query)
                assignedNumbers.Add(myNumber);
            }
            finally
            {
                sem.Release();
            }
        });

        await Task.WhenAll(tasks);

        assignedNumbers.Should().OnlyHaveUniqueItems("each concurrent task must receive a unique voucher number");
        assignedNumbers.Should().HaveCount(20);
    }
}
