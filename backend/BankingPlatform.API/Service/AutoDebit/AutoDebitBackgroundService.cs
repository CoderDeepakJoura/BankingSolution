namespace BankingPlatform.API.Service.AutoDebit
{
    public class AutoDebitBackgroundService : BackgroundService
    {
        private readonly AutoDebitService _autoDebitService;
        private readonly ILogger<AutoDebitBackgroundService> _logger;

        public AutoDebitBackgroundService(AutoDebitService autoDebitService, ILogger<AutoDebitBackgroundService> logger)
        {
            _autoDebitService = autoDebitService;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("AutoDebit BackgroundService started.");

            // Wait until the start of the next minute, then fire every 60 seconds
            var now = DateTime.Now;
            var delay = TimeSpan.FromSeconds(60 - now.Second);
            await Task.Delay(delay, stoppingToken);

            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
            while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await _autoDebitService.RunDueBranchesAsync(DateTime.Now);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "AutoDebit BackgroundService tick failed.");
                }
            }
        }
    }
}
