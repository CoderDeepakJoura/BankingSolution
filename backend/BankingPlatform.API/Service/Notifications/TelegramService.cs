using System.Text;
using System.Text.Json;

namespace BankingPlatform.API.Service.Notifications
{
    public interface ITelegramService
    {
        Task SendMessageAsync(string chatId, string message);
    }

    public class TelegramService : ITelegramService
    {
        private readonly HttpClient _http;
        private readonly string _botToken;
        private readonly ILogger<TelegramService> _logger;

        public TelegramService(IHttpClientFactory httpClientFactory, IConfiguration config, ILogger<TelegramService> logger)
        {
            _http = httpClientFactory.CreateClient();
            _botToken = config["Telegram:BotToken"] ?? "";
            _logger = logger;
        }

        public async Task SendMessageAsync(string chatId, string message)
        {
            if (string.IsNullOrEmpty(_botToken) || string.IsNullOrEmpty(chatId))
                return;

            try
            {
                var url = $"https://api.telegram.org/bot{_botToken}/sendMessage";
                var payload = JsonSerializer.Serialize(new { chat_id = chatId, text = message, parse_mode = "HTML" });
                var content = new StringContent(payload, Encoding.UTF8, "application/json");
                var response = await _http.PostAsync(url, content);
                if (!response.IsSuccessStatusCode)
                {
                    var body = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Telegram sendMessage failed: {Status} {Body}", response.StatusCode, body);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Telegram sendMessage threw an exception for chatId={ChatId}", chatId);
            }
        }
    }
}
