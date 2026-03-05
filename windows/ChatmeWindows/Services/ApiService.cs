using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace ChatmeWindows.Services
{
    public class ApiService
    {
        private readonly HttpClient _httpClient;
        private const string BaseUrl = "https://shphbjeio23.chatme.tj";

        public ApiService()
        {
            _httpClient = new HttpClient { BaseAddress = new Uri(BaseUrl) };
        }

        public void SetToken(string token)
        {
            _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        }

        public async Task<bool> SendVerificationCodeAsync(string email)
        {
            var response = await _httpClient.PostAsJsonAsync("/auth/send-code", new { email });
            return response.IsSuccessStatusCode;
        }

        public async Task<AuthResponse?> LoginWithGoogleAsync(string idToken)
        {
            var response = await _httpClient.PostAsJsonAsync("/auth/google", new { token = idToken });
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<AuthResponse>(content);
            }
            return null;
        }

        public async Task<AuthResponse?> LoginAsync(string email, string code)
        {
            var response = await _httpClient.PostAsJsonAsync("/auth/verify-code", new { email, code });
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<AuthResponse>(content);
            }
            return null;
        }

        public async Task<List<ConversationDto>> GetConversationsAsync(string userId)
        {
            var response = await _httpClient.GetAsync($"/conversations?userId={userId}");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<List<ConversationDto>>(content) ?? new List<ConversationDto>();
            }
            return new List<ConversationDto>();
        }

        public async Task<List<MessageDto>> GetMessagesAsync(int partnerId)
        {
            var response = await _httpClient.GetAsync($"/messages/{partnerId}");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<List<MessageDto>>(content) ?? new List<MessageDto>();
            }
            return new List<MessageDto>();
        }
    }

    public class AuthResponse
    {
        public string Token { get; set; } = string.Empty;
        public UserDto User { get; set; } = new();
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhotoUrl { get; set; }
    }

    public class ConversationDto
    {
        public int PartnerId { get; set; }
        public string PartnerName { get; set; } = string.Empty;
        public string? LastMessage { get; set; }
        public long? LastMessageTime { get; set; }
        public int UnreadCount { get; set; }
    }

    public class MessageDto
    {
        public string Id { get; set; } = string.Empty;
        public int SenderId { get; set; }
        public string Content { get; set; } = string.Empty;
        public string Type { get; set; } = "text";
        public DateTime CreatedAt { get; set; }
    }
}
