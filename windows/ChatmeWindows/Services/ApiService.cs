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

        public async Task<List<MessageDto>> GetMessagesAsync(int userId, int partnerId)
        {
            var response = await _httpClient.GetAsync($"/messages?userId={userId}&otherUserId={partnerId}");
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

        // --- Learning / Flashcard Endpoints ---

        public async Task<FlashcardsResponse?> GetFlashcardsAsync()
        {
            var response = await _httpClient.GetAsync("/flashcards");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<FlashcardsResponse>(content);
            }
            return null;
        }

        public async Task<bool> CreateFlashcardAsync(string front, string back)
        {
            var response = await _httpClient.PostAsJsonAsync("/flashcards", new { front, back });
            return response.IsSuccessStatusCode;
        }

        public async Task<bool> DeleteFlashcardAsync(int id)
        {
            var response = await _httpClient.DeleteAsync($"/flashcards/{id}");
            return response.IsSuccessStatusCode;
        }

        public async Task<bool> UpdateFlashcardReviewAsync(int id, int grade)
        {
            var response = await _httpClient.PostAsJsonAsync($"/flashcards/{id}/review", new { grade });
            return response.IsSuccessStatusCode;
        }

        public async Task<LearningStatsDto?> GetLearningStatsAsync()
        {
            var response = await _httpClient.GetAsync("/learning/stats");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<LearningStatsDto>(content);
            }
            return null;
        }

        // --- Leaderboard Endpoints ---

        public async Task<LeaderboardResponse?> GetLeaderboardAsync()
        {
            var response = await _httpClient.GetAsync("/gamification/leaderboard");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<LeaderboardResponse>(content);
            }
            return null;
        }

        public async Task<ProfileDto?> GetProfileAsync(int userId)
        {
            var response = await _httpClient.GetAsync($"/profile?userId={userId}");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<ProfileDto>(content);
            }
            return null;
        }

        public async Task<List<CommunityPostDto>> GetCommunityPostsAsync(int userId)
        {
            var response = await _httpClient.GetAsync($"/community/user?userId={userId}");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<List<CommunityPostDto>>(content) ?? new List<CommunityPostDto>();
            }
            return new List<CommunityPostDto>();
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
        
        [JsonProperty("avatar")]
        public string? PhotoUrl { get; set; }

        [JsonProperty("photoURL")]
        public string? PhotoUrlFallback { get; set; }
        
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
        
        [JsonProperty("is_vip")]
        public bool IsVip { get; set; }

        [JsonProperty("bio")]
        public string? Bio { get; set; }

        [JsonProperty("level")]
        public int Level { get; set; }

        [JsonProperty("unique_id")]
        public string? UniqueId { get; set; }
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

        [JsonProperty("partner_is_vip")]
        public int IsVipInt { get; set; }

        [JsonProperty("partner_last_active")]
        public long? PartnerLastActive { get; set; }

        public bool IsVip => IsVipInt == 1;
        public bool IsOnline => PartnerLastActive.HasValue && (DateTimeOffset.Now.ToUnixTimeSeconds() - PartnerLastActive.Value) < 300;
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
        
        [JsonProperty("status")]
        public string? Status { get; set; }

        [JsonProperty("reply_to")]
        public object? ReplyTo { get; set; }

        [JsonProperty("created_at")]
        public long CreatedAt { get; set; }
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

    public class FlashcardDto
    {
        [JsonProperty("id")]
        public int Id { get; set; }
        [JsonProperty("front")]
        public string Front { get; set; } = string.Empty;
        [JsonProperty("back")]
        public string Back { get; set; } = string.Empty;
        [JsonProperty("next_review")]
        public string? NextReview { get; set; }
        [JsonProperty("efactor")]
        public double EFactor { get; set; } = 2.5;
        [JsonProperty("interval")]
        public int Interval { get; set; } = 0;
        [JsonProperty("repetitions")]
        public int Repetitions { get; set; } = 0;
    }

    public class FlashcardsResponse
    {
        [JsonProperty("flashcards")]
        public List<FlashcardDto> Flashcards { get; set; } = new();
    }

    public class LearningStatsDto
    {
        [JsonProperty("streak")]
        public int Streak { get; set; }
        [JsonProperty("xp")]
        public int Xp { get; set; }
        [JsonProperty("total_corrections")]
        public int TotalCorrections { get; set; }
    }

    public class LeaderboardUserDto
    {
        [JsonProperty("id")]
        public int Id { get; set; }
        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;
        [JsonProperty("avatar")]
        public string? Avatar { get; set; }
        [JsonProperty("xp")]
        public int Xp { get; set; }
        [JsonProperty("level")]
        public int Level { get; set; }
        [JsonProperty("rank")]
        public int Rank { get; set; }
        [JsonProperty("is_vip")]
        public int IsVip { get; set; }
    }

    public class LeaderboardResponse
    {
        [JsonProperty("top_users")]
        public List<LeaderboardUserDto> TopUsers { get; set; } = new();
        [JsonProperty("current_user")]
        public LeaderboardUserDto? CurrentUser { get; set; }
    }

    public class ProfileDto : AppUser
    {
        [JsonProperty("native_language")]
        public string? NativeLanguage { get; set; }

        [JsonProperty("learning_language")]
        public string? LearningLanguage { get; set; }

        [JsonProperty("interests")]
        public List<InterestDto>? Interests { get; set; }

        [JsonProperty("rating")]
        public double Rating { get; set; }

        [JsonProperty("rating_count")]
        public int RatingCount { get; set; }

        [JsonProperty("vip_until")]
        public long? VipUntil { get; set; }

        [JsonProperty("followers_count")]
        public int FollowersCount { get; set; }

        [JsonProperty("following_count")]
        public int FollowingCount { get; set; }

        [JsonProperty("guests_count")]
        public int GuestsCount { get; set; }
    }
    public class InterestDto
    {
        [JsonProperty("name")]
        public string? Name { get; set; }
        [JsonProperty("key")]
        public string? Key { get; set; }
    }
}
