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

        // --- Explore Endpoints ---

        public async Task<ExploreResponse?> GetExploreUsersAsync(int userId, string gender = "any", string location = "any")
        {
            var url = $"/users/random?userId={userId}&limit=40&offset=0";
            if (gender != "any") url += $"&gender={gender}";
            if (location != "any") url += $"&location={location}";

            var response = await _httpClient.GetAsync(url);
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<ExploreResponse>(content);
            }
            return null;
        }

        public async Task<SmartMatchResponse?> GetSmartMatchAsync(int userId, string gender = "any", string location = "any")
        {
            var url = $"/users/smart-match?userId={userId}&gender={gender}&location={location}";
            var response = await _httpClient.GetAsync(url);
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<SmartMatchResponse>(content);
            }
            return null;
        }

        // --- Community Endpoints ---

        public async Task<List<CommunityPostDto>> GetCommunityFeedAsync(int? viewerId = null, int page = 1)
        {
            var url = $"/community/feed?page={page}&limit=20&sort=newest&time_range=all";
            if (viewerId.HasValue) url += $"&viewerId={viewerId.Value}";

            var response = await _httpClient.GetAsync(url);
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<List<CommunityPostDto>>(content) ?? new List<CommunityPostDto>();
            }
            return new List<CommunityPostDto>();
        }

        // --- Guests Endpoints ---

        public async Task<List<GuestDto>> GetGuestsAsync(int userId)
        {
            var response = await _httpClient.GetAsync($"/profile/guests?userId={userId}");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<List<GuestDto>>(content) ?? new List<GuestDto>();
            }
            return new List<GuestDto>();
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

        [JsonProperty("gender")]
        public string? Gender { get; set; }

        [JsonProperty("location")]
        public string? Location { get; set; }
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

    public class ExploreResponse
    {
        [JsonProperty("users")]
        public List<ExploreUserDto> Users { get; set; } = new();
        [JsonProperty("total_count")]
        public int TotalCount { get; set; }
    }

    public class ExploreUserDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Avatar { get; set; }
        public string? Gender { get; set; }
        public string? Location { get; set; }
        public string? Bio { get; set; }
        [JsonProperty("native_language")]
        public string? NativeLanguage { get; set; }
        [JsonProperty("learning_language")]
        public string? LearningLanguage { get; set; }
        public bool IsOnline { get; set; }
    }

    public class SmartMatchResponse
    {
        public int? Id { get; set; }
        public string? Name { get; set; }
    }

    public class CommunityPostDto
    {
        public int Id { get; set; }
        [JsonProperty("user_id")]
        public int UserId { get; set; }
        [JsonProperty("user_name")]
        public string UserName { get; set; } = string.Empty;
        [JsonProperty("user_avatar")]
        public string? UserAvatar { get; set; }
        [JsonProperty("content_type")]
        public string ContentType { get; set; } = "text";
        [JsonProperty("text_content")]
        public string? TextContent { get; set; }
        [JsonProperty("media_path")]
        public string? MediaPath { get; set; }
        [JsonProperty("likes_count")]
        public int LikesCount { get; set; }
        [JsonProperty("comments_count")]
        public int CommentsCount { get; set; }
        [JsonProperty("created_at")]
        public long CreatedAt { get; set; }
    }

    public class GuestDto
    {
        [JsonProperty("viewer_id")]
        public int ViewerId { get; set; }
        [JsonProperty("viewer_name")]
        public string ViewerName { get; set; } = string.Empty;
        [JsonProperty("viewer_avatar")]
        public string? ViewerAvatar { get; set; }
        [JsonProperty("view_count")]
        public int ViewCount { get; set; }
        [JsonProperty("last_viewed")]
        public long LastViewed { get; set; }
    }
}
