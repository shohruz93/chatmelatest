using System.Collections.ObjectModel;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media.Imaging;
using Microsoft.UI.Xaml.Navigation;
using ChatmeWindows.Services;
using Newtonsoft.Json.Linq;
using Windows.Storage;
using System;

namespace ChatmeWindows.Views
{
    public sealed partial class MainPage : Page
    {
        private AuthResponse? _currentUser;
        private readonly ApiService _apiService = new();
        private readonly SocketService _socketService = new();
        
        public ObservableCollection<ConversationViewModel> Conversations { get; } = new();
        public ObservableCollection<MessageViewModel> Messages { get; } = new();
        public ObservableCollection<ExploreUserViewModel> ExploreUsers { get; } = new();
        public ObservableCollection<GuestViewModel> Guests { get; } = new();
        public ObservableCollection<CommunityPostViewModel> CommunityPosts { get; } = new();

        private static Microsoft.UI.Xaml.Media.ImageSource? GetSafeImageSource(string? url)
        {
            if (string.IsNullOrEmpty(url)) return null;
            
            string finalUrl = url;
            if (finalUrl.StartsWith("/") || finalUrl.StartsWith("uploads/"))
            {
                finalUrl = finalUrl.StartsWith("/") 
                    ? $"https://shphbjeio23.chatme.tj{finalUrl}"
                    : $"https://shphbjeio23.chatme.tj/{finalUrl}";
            }

            try
            {
                if (Uri.TryCreate(finalUrl, UriKind.Absolute, out Uri? uri))
                {
                    return new BitmapImage(uri);
                }
            }
            catch { }
            return null;
        }

        public MainPage()
        {
            this.InitializeComponent();
            
            // Apply loaded user to header
            if (TryGetLocalSetting("UserName", out var userName))
            {
                MyNameText.Text = userName;
            }
            if (TryGetLocalSetting("UserPhoto", out var userPhoto))
            {
                MyAvatar.ProfilePicture = GetSafeImageSource(userPhoto);
            }
            if (TryGetLocalSetting("UserCoins", out var userCoins))
            {
                MyCoinsText.Text = userCoins ?? "0";
            }
            if (TryGetLocalSetting("UserXp", out var userXp))
            {
                MyXpText.Text = userXp ?? "0";
            }

            ChatListView.ItemsSource = Conversations;
            MessageListView.ItemsSource = Messages;
            UsersGrid.ItemsSource = ExploreUsers;
            GuestsGrid.ItemsSource = Guests;
            CommunityFeedListView.ItemsSource = CommunityPosts;
        }

        protected override async void OnNavigatedTo(NavigationEventArgs e)
        {
            if (e.Parameter is AuthResponse response)
            {
                _currentUser = response;
                _apiService.SetToken(response.Token);
                
                MyNameText.Text = response.User.Name;
                MyAvatar.ProfilePicture = GetSafeImageSource(response.User.PhotoUrl);
                MyCoinsText.Text = response.User.Coins.ToString();
                MyXpText.Text = response.User.Xp.ToString();

                await LoadConversations();
                await LoadExploreUsers(); 
                await LoadGuests();
                await LoadCommunityFeed();
                await _socketService.ConnectAsync(response.User.Id.ToString());
                
                _socketService.OnMessageReceived += socketData =>
                {
                    this.DispatcherQueue.TryEnqueue(() =>
                    {
                        var msg = socketData.ToObject<MessageDto>();
                        if (msg != null && MessagesView.IsLoaded && MessagesView.Visibility == Visibility.Visible && ActiveChatContent.Visibility == Visibility.Visible && ChatListView.SelectedItem is ConversationViewModel selected && selected.PartnerId == msg.SenderId)
                        {
                            Messages.Add(new MessageViewModel(msg.Content, msg.SenderId == _currentUser.User.Id, msg.CreatedAt));
                        }
                    });
                };
            }
        }
        
        private void MainNav_SelectionChanged_Fallback(object sender, RoutedEventArgs e)
        {
             // Placeholder for "My Profile" click
             System.Diagnostics.Debug.WriteLine("Navigating to Profile...");
        }

        private async Task LoadConversations()
        {
            if (_currentUser == null) return;
            var list = await _apiService.GetConversationsAsync(_currentUser.User.Id.ToString());
            Conversations.Clear();
            foreach (var item in list) Conversations.Add(new ConversationViewModel(item));
        }

        private async Task LoadExploreUsers()
        {
            if (_currentUser == null) return;
            var response = await _apiService.GetExploreUsersAsync(_currentUser.User.Id);
            if (response != null)
            {
                UserCountText.Text = $"{response.TotalCount} корбар ёфт шуд";
                ExploreUsers.Clear();
                foreach (var user in response.Users)
                {
                    ExploreUsers.Add(new ExploreUserViewModel(user));
                }
            }
        }

        private async Task LoadGuests()
        {
            if (_currentUser == null) return;
            var list = await _apiService.GetGuestsAsync(_currentUser.User.Id);
            Guests.Clear();
            foreach (var g in list) Guests.Add(new GuestViewModel(g));
        }

        private async Task LoadCommunityFeed()
        {
            if (_currentUser == null) return;
            var list = await _apiService.GetCommunityFeedAsync(_currentUser.User.Id);
            CommunityPosts.Clear();
            foreach (var post in list) CommunityPosts.Add(new CommunityPostViewModel(post));
        }

        private void MainNav_SelectionChanged(NavigationView sender, NavigationViewSelectionChangedEventArgs args)
        {
            var tag = args.SelectedItemContainer?.Tag?.ToString();
            if (tag == null) return;

            // Reset visibilities
            ExploreView.Visibility = Visibility.Collapsed;
            MessagesView.Visibility = Visibility.Collapsed;
            CommunityView.Visibility = Visibility.Collapsed;
            GuestsView.Visibility = Visibility.Collapsed;
            VoiceRoomsView.Visibility = Visibility.Collapsed;
            TabSelectorGrid.Visibility = Visibility.Collapsed;

            switch (tag)
            {
                case "Messages":
                    MessagesView.Visibility = Visibility.Visible;
                    break;
                case "Explore":
                    ExploreView.Visibility = Visibility.Visible;
                    TabSelectorGrid.Visibility = Visibility.Visible;
                    break;
                case "Community":
                    CommunityView.Visibility = Visibility.Visible;
                    TabSelectorGrid.Visibility = Visibility.Visible;
                    _ = LoadCommunityFeed();
                    break;
                case "Guests":
                    GuestsView.Visibility = Visibility.Visible;
                    _ = LoadGuests();
                    break;
                case "VoiceRooms":
                    VoiceRoomsView.Visibility = Visibility.Visible;
                    break;
            }
        }

        private void TabButton_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button b && b == UsersTabButton)
            {
                ExploreView.Visibility = Visibility.Visible;
                CommunityView.Visibility = Visibility.Collapsed;
                UsersTabButton.Background = (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["SystemAccentColorBrush"];
                UsersTabButton.Foreground = new Microsoft.UI.Xaml.Media.SolidColorBrush(Microsoft.UI.Colors.White);
                CommunityTabButton.Background = new Microsoft.UI.Xaml.Media.SolidColorBrush(Microsoft.UI.Colors.Transparent);
                CommunityTabButton.Foreground = (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["TextFillColorSecondaryBrush"];
            }
            else
            {
                ExploreView.Visibility = Visibility.Collapsed;
                CommunityView.Visibility = Visibility.Visible;
                CommunityTabButton.Background = (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["SystemAccentColorBrush"];
                CommunityTabButton.Foreground = new Microsoft.UI.Xaml.Media.SolidColorBrush(Microsoft.UI.Colors.White);
                UsersTabButton.Background = new Microsoft.UI.Xaml.Media.SolidColorBrush(Microsoft.UI.Colors.Transparent);
                UsersTabButton.Foreground = (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["TextFillColorSecondaryBrush"];
            }
        }

        private async void RandomConnectButton_Click(object sender, RoutedEventArgs e)
        {
            if (_currentUser == null) return;
            var match = await _apiService.GetSmartMatchAsync(_currentUser.User.Id);
            if (match != null && match.Id.HasValue)
            {
                OpenChatWithUser(match.Id.Value, match.Name ?? "User");
            }
        }

        private void ExploreSendMessage_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button btn && btn.Tag is ExploreUserViewModel user)
            {
                OpenChatWithUser(user.Id, user.Name);
            }
        }

        private async void OpenChatWithUser(int userId, string name)
        {
            // Switch to Messages view
            MessagesView.Visibility = Visibility.Visible;
            ExploreView.Visibility = Visibility.Collapsed;
            TabSelectorGrid.Visibility = Visibility.Collapsed;
            
            // Set as active chat
            EmptyChatState.Visibility = Visibility.Collapsed;
            ActiveChatContent.Visibility = Visibility.Visible;
            ChatHeaderName.Text = name;
            ChatHeaderStatus.Text = "Connecting...";

            // Find or add to conversations
            var existing = Conversations.FirstOrDefault(c => c.PartnerId == userId);
            if (existing == null)
            {
                var newConv = new ConversationViewModel(new ConversationDto { PartnerId = userId, PartnerName = name });
                Conversations.Insert(0, newConv);
                ChatListView.SelectedItem = newConv;
            }
            else
            {
                ChatListView.SelectedItem = existing;
            }

            // Load history
            var history = await _apiService.GetMessagesAsync(userId);
            Messages.Clear();
            foreach (var m in history)
            {
                Messages.Add(new MessageViewModel(m.Content, m.SenderId == _currentUser?.User.Id, m.CreatedAt));
            }
            ChatHeaderStatus.Text = "Online";
        }

        private async void ChatListView_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (ChatListView.SelectedItem is ConversationViewModel selected)
            {
                EmptyChatState.Visibility = Visibility.Collapsed;
                ActiveChatContent.Visibility = Visibility.Visible;
                ChatHeaderName.Text = selected.PartnerName;
                ActiveChatAvatar.ProfilePicture = selected.AvatarUrl;
                
                var history = await _apiService.GetMessagesAsync(selected.PartnerId);
                Messages.Clear();
                foreach (var m in history)
                {
                    Messages.Add(new MessageViewModel(m.Content, m.SenderId == _currentUser?.User.Id, m.CreatedAt));
                }
            }
        }

        private async void SendButton_Click(object sender, RoutedEventArgs e)
        {
            await SendMessage();
        }

        private async void MessageInput_KeyDown(object sender, Microsoft.UI.Xaml.Input.KeyRoutedEventArgs e)
        {
            if (e.Key == Windows.System.VirtualKey.Enter && !Microsoft.UI.Input.InputKeyboardSource.GetKeyStateForCurrentThread(Windows.System.VirtualKey.Shift).HasFlag(Windows.UI.Core.CoreVirtualKeyStates.Down)) 
            {
                e.Handled = true;
                await SendMessage();
            }
        }

        private async Task SendMessage()
        {
            if (string.IsNullOrWhiteSpace(MessageInput.Text) || ChatListView.SelectedItem is not ConversationViewModel selected) return;

            string text = MessageInput.Text.Trim();
            MessageInput.Text = "";
            
            await _socketService.SendMessageAsync(selected.PartnerId, text);
            Messages.Add(new MessageViewModel(text, true, DateTime.Now));
        }

        private void ThemeMenuItem_Click(object sender, RoutedEventArgs e)
        {
            if (this.RequestedTheme == ElementTheme.Dark)
            {
                this.RequestedTheme = ElementTheme.Light;
            }
            else if (this.RequestedTheme == ElementTheme.Light)
            {
                this.RequestedTheme = ElementTheme.Default;
            }
            else
            {
                this.RequestedTheme = ElementTheme.Dark;
            }
        }

        private void LogoutMenuItem_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                string sessionPath = System.IO.Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "ChatmeWindows", "session.json");
                if (System.IO.File.Exists(sessionPath))
                {
                    System.IO.File.Delete(sessionPath);
                }
            }
            catch { }
            
            this.Frame.Navigate(typeof(LoginView));
        }

        private static bool TryGetLocalSetting(string key, out string? value)
        {
            value = null;
            try
            {
                var values = Windows.Storage.ApplicationData.Current.LocalSettings.Values;
                if (values.ContainsKey(key))
                {
                    value = values[key]?.ToString();
                    return true;
                }
                return false;
            }
            catch (InvalidOperationException) // unpackaged / no package identity
            {
                // fallback to file-based settings (optional)
                try
                {
                    string settingsPath = System.IO.Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                        "ChatmeWindows", "localsettings.json");
                    if (System.IO.File.Exists(settingsPath))
                    {
                        var dict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string,string>>(
                            System.IO.File.ReadAllText(settingsPath));
                        if (dict != null && dict.TryGetValue(key, out var v))
                        {
                            value = v;
                            return true;
                        }
                    }
                }
                catch { /* swallow fallback errors */ }
                return false;
            }
        }
    }

    public class ExploreUserViewModel
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? AvatarUrlString { get; set; }
        public string? Gender { get; set; }
        public string? LocationName { get; set; }
        public string? Bio { get; set; }
        public string? NativeLanguage { get; set; }
        public bool IsOnline { get; set; }

        public Microsoft.UI.Xaml.Media.ImageSource? Avatar => GetSafeImage(AvatarUrlString);
        public Visibility IsOnlineVisibility => IsOnline ? Visibility.Visible : Visibility.Collapsed;

        public ExploreUserViewModel(ExploreUserDto dto)
        {
            Id = dto.Id;
            Name = dto.Name;
            AvatarUrlString = dto.Avatar;
            Gender = dto.Gender ?? "N/A";
            LocationName = dto.Location ?? "N/A";
            Bio = dto.Bio ?? "No bio yet.";
            NativeLanguage = dto.NativeLanguage ?? "N/A";
            IsOnline = dto.IsOnline;
        }

        private static Microsoft.UI.Xaml.Media.ImageSource? GetSafeImage(string? url)
        {
            if (string.IsNullOrEmpty(url)) return null;
            string finalUrl = url;
            if (finalUrl.StartsWith("/") || finalUrl.StartsWith("uploads/"))
            {
                finalUrl = finalUrl.StartsWith("/") 
                    ? $"https://shphbjeio23.chatme.tj{finalUrl}"
                    : $"https://shphbjeio23.chatme.tj/{finalUrl}";
            }
            try
            {
                if (Uri.TryCreate(finalUrl, UriKind.Absolute, out Uri? uri))
                    return new Microsoft.UI.Xaml.Media.Imaging.BitmapImage(uri);
            }
            catch { }
            return null;
        }
    }

    public class GuestViewModel
    {
        public string ViewerName { get; set; }
        public string? AvatarUrlString { get; set; }
        public int ViewCount { get; set; }
        public string LastViewedTime { get; set; }

        public string ViewCountText => $"{ViewCount} тамошо";

        public Microsoft.UI.Xaml.Media.ImageSource? AvatarUrl 
        {
            get 
            {
                if (string.IsNullOrEmpty(AvatarUrlString)) return null;
                string finalUrl = AvatarUrlString;
                if (finalUrl.StartsWith("/") || finalUrl.StartsWith("uploads/"))
                {
                    finalUrl = finalUrl.StartsWith("/") 
                        ? $"https://shphbjeio23.chatme.tj{finalUrl}"
                        : $"https://shphbjeio23.chatme.tj/{finalUrl}";
                }
                try
                {
                    if (Uri.TryCreate(finalUrl, UriKind.Absolute, out Uri? uri))
                        return new Microsoft.UI.Xaml.Media.Imaging.BitmapImage(uri);
                }
                catch { }
                return null;
            }
        }

        public GuestViewModel(GuestDto dto)
        {
            ViewerName = dto.ViewerName;
            AvatarUrlString = dto.ViewerAvatar;
            ViewCount = dto.ViewCount;
            LastViewedTime = DateTimeOffset.FromUnixTimeSeconds(dto.LastViewed).LocalDateTime.ToString("g");
        }
    }

    public class CommunityPostViewModel
    {
        public int Id { get; set; }
        public string UserName { get; set; }
        public string? UserAvatarString { get; set; }
        public string? ContentType { get; set; }
        public string? TextContent { get; set; }
        public string? MediaUrlString { get; set; }
        public int LikesCount { get; set; }
        public int CommentsCount { get; set; }
        public string CreatedAtString { get; set; }

        public Microsoft.UI.Xaml.Media.ImageSource? UserAvatar => GetSafeImage(UserAvatarString);
        public Microsoft.UI.Xaml.Media.ImageSource? MediaContent => GetSafeImage(MediaUrlString);
        
        public Visibility TextVisibility => !string.IsNullOrEmpty(TextContent) ? Visibility.Visible : Visibility.Collapsed;
        public Visibility MediaVisibility => !string.IsNullOrEmpty(MediaUrlString) ? Visibility.Visible : Visibility.Collapsed;

        public CommunityPostViewModel(CommunityPostDto dto)
        {
            Id = dto.Id;
            UserName = dto.UserName;
            UserAvatarString = dto.UserAvatar;
            ContentType = dto.ContentType;
            TextContent = dto.TextContent;
            MediaUrlString = dto.MediaPath;
            LikesCount = dto.LikesCount;
            CommentsCount = dto.CommentsCount;
            CreatedAtString = DateTimeOffset.FromUnixTimeSeconds(dto.CreatedAt).LocalDateTime.ToString("g");
        }

        private static Microsoft.UI.Xaml.Media.ImageSource? GetSafeImage(string? url)
        {
            if (string.IsNullOrEmpty(url)) return null;
            string finalUrl = url;
            if (finalUrl.StartsWith("/") || finalUrl.StartsWith("uploads/"))
            {
                finalUrl = finalUrl.StartsWith("/") 
                    ? $"https://shphbjeio23.chatme.tj{finalUrl}"
                    : $"https://shphbjeio23.chatme.tj/{finalUrl}";
            }
            try
            {
                if (Uri.TryCreate(finalUrl, UriKind.Absolute, out Uri? uri))
                    return new Microsoft.UI.Xaml.Media.Imaging.BitmapImage(uri);
            }
            catch { }
            return null;
        }
    }

    public class ConversationViewModel
    {
        public int PartnerId { get; set; }
        public string PartnerName { get; set; } = string.Empty;
        
        public string? AvatarUrlString { get; set; }
        public Microsoft.UI.Xaml.Media.ImageSource? AvatarUrl 
        {
            get 
            {
                if (string.IsNullOrEmpty(AvatarUrlString)) return null;
                
                string finalUrl = AvatarUrlString;
                if (finalUrl.StartsWith("/") || finalUrl.StartsWith("uploads/"))
                {
                    finalUrl = finalUrl.StartsWith("/") 
                        ? $"https://shphbjeio23.chatme.tj{finalUrl}"
                        : $"https://shphbjeio23.chatme.tj/{finalUrl}";
                }
                
                try
                {
                    if (Uri.TryCreate(finalUrl, UriKind.Absolute, out Uri? uri))
                        return new Microsoft.UI.Xaml.Media.Imaging.BitmapImage(uri);
                }
                catch { }
                return null;
            }
        }
        
        public string? LastMessage { get; set; }
        public long? LastMessageTime { get; set; }
        public int UnreadCount { get; set; }

        public string FormattedTime => LastMessageTime.HasValue 
            ? DateTimeOffset.FromUnixTimeMilliseconds(LastMessageTime.Value).ToLocalTime().ToString("HH:mm") 
            : "";

        public Visibility UnreadVisibility => UnreadCount > 0 ? Visibility.Visible : Visibility.Collapsed;
        public string UnreadCountText => UnreadCount > 99 ? "99+" : UnreadCount.ToString();

        public ConversationViewModel(ConversationDto dto)
        {
            PartnerId = dto.PartnerId;
            PartnerName = dto.PartnerName;
            LastMessage = dto.LastMessage;
            LastMessageTime = dto.LastMessageTime;
            UnreadCount = dto.UnreadCount;
            AvatarUrlString = dto.PartnerAvatar; 
        }
    }

    public class MessageViewModel
    {
        public string Content { get; set; } = string.Empty;
        public bool IsMe { get; set; }
        public DateTime CreatedAt { get; set; }

        public MessageViewModel(string content, bool isMe, DateTime createdAt)
        {
            Content = content;
            IsMe = isMe;
            CreatedAt = createdAt;
        }

        public string TimeString => CreatedAt.ToString("HH:mm");

        public HorizontalAlignment Alignment => IsMe ? HorizontalAlignment.Right : HorizontalAlignment.Left;
        
        public Microsoft.UI.Xaml.Media.Brush BackgroundBrush => IsMe 
            ? (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["PrimaryGradient"] 
            : (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["LayerFillColorAltBrush"];
            
        public Microsoft.UI.Xaml.Media.Brush BorderBrush => IsMe 
            ? new Microsoft.UI.Xaml.Media.SolidColorBrush(Microsoft.UI.Colors.Transparent) 
            : (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["SurfaceStrokeColorDefaultBrush"];
            
        public Microsoft.UI.Xaml.Thickness BorderThickness => IsMe 
            ? new Microsoft.UI.Xaml.Thickness(0) 
            : new Microsoft.UI.Xaml.Thickness(1);
            
        public Microsoft.UI.Xaml.Media.Brush TextColor => IsMe 
            ? new Microsoft.UI.Xaml.Media.SolidColorBrush(Microsoft.UI.Colors.White) 
            : (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["TextFillColorPrimaryBrush"];
            
        public Microsoft.UI.Xaml.Media.Brush TimeColor => IsMe 
            ? new Microsoft.UI.Xaml.Media.SolidColorBrush(Windows.UI.Color.FromArgb(200, 255, 255, 255)) 
            : (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["TextFillColorTertiaryBrush"];
            
        public CornerRadius BubbleRadius => IsMe
            ? new CornerRadius(16, 16, 4, 16)
            : new CornerRadius(16, 16, 16, 4);
    }
}
