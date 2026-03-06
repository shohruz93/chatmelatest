using System.Collections.ObjectModel;
using System.Threading.Tasks;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media.Imaging;
using Microsoft.UI.Xaml.Navigation;
using ChatmeWindows.Services;
using Newtonsoft.Json.Linq;
using Windows.Storage;

namespace ChatmeWindows.Views
{
    public sealed partial class MainPage : Page
    {
        private AuthResponse? _currentUser;
        private readonly ApiService _apiService = new();
        private readonly SocketService _socketService = new();
        
        public ObservableCollection<ConversationViewModel> Conversations { get; } = new();
        public ObservableCollection<MessageViewModel> Messages { get; } = new();

        private static Microsoft.UI.Xaml.Media.ImageSource? GetSafeImageSource(string? url)
        {
            if (string.IsNullOrEmpty(url)) return null;
            try
            {
                if (Uri.TryCreate(url, UriKind.Absolute, out Uri? uri))
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
                await _socketService.ConnectAsync(response.User.Id.ToString());
                
                _socketService.OnMessageReceived += socketData =>
                {
                    this.DispatcherQueue.TryEnqueue(() =>
                    {
                        var msg = socketData.ToObject<MessageDto>();
                        if (msg != null && ActiveChatPanel.Visibility == Visibility.Visible && ChatListView.SelectedItem is ConversationViewModel selected && selected.PartnerId == msg.SenderId)
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

        private async void ChatListView_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (ChatListView.SelectedItem is ConversationViewModel selected)
            {
                EmptyStatePanel.Visibility = Visibility.Collapsed;
                ActiveChatPanel.Visibility = Visibility.Visible;
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
            if (e.Key == Windows.System.VirtualKey.Enter && Windows.UI.Core.CoreWindow.GetForCurrentThread().GetKeyState(Windows.System.VirtualKey.Shift) == Windows.UI.Core.CoreVirtualKeyStates.None) 
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

        private void MainNav_SelectionChanged(NavigationView sender, NavigationViewSelectionChangedEventArgs args)
        {
            if (args.IsSettingsSelected)
            {
                // Navigate to standard settings page if needed
            }
            else if (args.SelectedItemContainer != null)
            {
                var tag = args.SelectedItemContainer.Tag?.ToString();
                switch (tag)
                {
                    case "Home":
                    case "Wallet":
                    case "Games":
                        // For demonstration, navigate or change content
                        System.Diagnostics.Debug.WriteLine($"Navigated to: {tag}");
                        break;
                    case "Messages":
                        // Current page
                        break;
                }
            }
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
