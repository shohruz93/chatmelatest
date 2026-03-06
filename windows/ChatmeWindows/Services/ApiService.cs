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
        public AppUser User { get; set; } = new();
    }

    public class AppUser
    {
        [JsonProperty("id")]
        public int Id { get; set; }
        
        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;
        
        [JsonProperty("email")]
        public string Email { get; set; } = string.Empty;
        
        [JsonProperty("photoURL")]
        public string? PhotoUrl { get; set; }
        
        [JsonProperty("coins")]
        public int Coins { get; set; }
        
        [JsonProperty("xp")]
        public int Xp { get; set; }
        
        [JsonProperty("is_admin")]
        public bool IsAdmin { get; set; }
    }

    public class ConversationDto
    {
        [JsonProperty("partner_id")]
        public int PartnerId { get; set; }
        
        [JsonProperty("partner_name")]
        public string PartnerName { get; set; } = string.Empty;
        
        [JsonProperty("partner_avatar")]
        public string? PartnerAvatar { get; set; }
        
        [JsonProperty("last_message")]
        public string? LastMessage { get; set; }
        
        [JsonProperty("last_message_time")]
        public long? LastMessageTime { get; set; }
        
        [JsonProperty("unread_count")]
        public int UnreadCount { get; set; }
    }

    public class MessageDto
    {
        [JsonProperty("id")]
        public string Id { get; set; } = string.Empty;
        
        [JsonProperty("sender_id")]
        public int SenderId { get; set; }
        
        [JsonProperty("content")]
        public string Content { get; set; } = string.Empty;
        
        [JsonProperty("type")]
        public string Type { get; set; } = "text";
        
        [JsonProperty("created_at")]
        public DateTime CreatedAt { get; set; }
    }
}
