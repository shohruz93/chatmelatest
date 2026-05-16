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
        public ObservableCollection<FlashcardViewModel> Flashcards { get; } = new();
        public ObservableCollection<LeaderboardItemViewModel> LeaderboardItems { get; } = new();

        // Learning state
        private List<FlashcardDto> _dueCards = new();
        private int _currentCardIndex = 0;
        private bool _showingAnswer = false;

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
                MyAvatar.DisplayName = userName ?? "";
                var avatarSource = GetSafeImageSource(userPhoto);
                if (avatarSource != null) MyAvatar.ProfilePicture = avatarSource;
            }
            if (TryGetLocalSetting("UserCoins", out var userCoins))
            {
                MyCoinsText.Text = userCoins ?? "0";
            }
            if (TryGetLocalSetting("UserXp", out var userXp))
            {
                MyXpText.Text = userXp ?? "0";
            }
            // Level removed as requested

            ChatListView.ItemsSource = Conversations;
            MessageListView.ItemsSource = Messages;
            UsersGrid.ItemsSource = ExploreUsers;
            GuestsGrid.ItemsSource = Guests;
            CommunityFeedListView.ItemsSource = CommunityPosts;
            FlashcardsList.ItemsSource = Flashcards;
            LeaderboardList.ItemsSource = LeaderboardItems;
        }

        protected override async void OnNavigatedTo(NavigationEventArgs e)
        {
            if (e.Parameter is AuthResponse response)
            {
                _currentUser = response;
                _apiService.SetToken(response.Token);
                
                // Initial UI update from login response (which is partial)
                MyNameText.Text = response.User.Name;
                MyAvatar.DisplayName = response.User.Name;
                
                // Try avatar first, then photoURL (Google)
                string? initialUrl = !string.IsNullOrEmpty(response.User.PhotoUrl) ? response.User.PhotoUrl : response.User.PhotoUrlFallback;
                var initialAvatarSource = GetSafeImageSource(initialUrl);
                if (initialAvatarSource != null) MyAvatar.ProfilePicture = initialAvatarSource;

                // Fetch full profile to get coins, XP, etc.
                var fullProfile = await _apiService.GetProfileAsync(response.User.Id);
                if (fullProfile != null)
                {
                    _currentUser.User = fullProfile;
                    
                    // Update stats
                    MyCoinsText.Text = fullProfile.Coins.ToString();
                    MyXpText.Text = fullProfile.Xp.ToString();
                    
                    // Update avatar if it changed or was loaded
                    string? fullUrl = !string.IsNullOrEmpty(fullProfile.PhotoUrl) ? fullProfile.PhotoUrl : fullProfile.PhotoUrlFallback;
                    var fullAvatarSource = GetSafeImageSource(fullUrl);
                    if (fullAvatarSource != null) MyAvatar.ProfilePicture = fullAvatarSource;
                }

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
                            Messages.Add(new MessageViewModel(msg, _currentUser.User.Id));
                        }
                    });
                };
            }
        }
        
        private void MainNav_SelectionChanged_Fallback(object sender, RoutedEventArgs e)
        {
            // Navigate to Profile view
            var profileItem = MainNav.MenuItems.OfType<NavigationViewItem>().FirstOrDefault(x => x.Tag?.ToString() == "Profile");
            if (profileItem != null) MainNav.SelectedItem = profileItem;
        }

        public ObservableCollection<CommunityPostViewModel> ProfilePosts { get; } = new();

        private async void UpdateProfilePageView()
        {
            if (_currentUser == null) return;
            var userId = _currentUser.User.Id;

            // Clear old data
            ProfilePosts.Clear();
            ProfileInterestsGrid.Children.Clear();

            var profile = await _apiService.GetProfileAsync(userId);
            if (profile == null) return;

            ProfilePageName.Text = profile.Name;
            ProfilePageEmail.Text = profile.Email;
            ProfilePageCoins.Text = profile.Coins.ToString();
            ProfilePageXp.Text = profile.Xp.ToString();
            ProfilePageUniqueId.Text = $"ID: {profile.UniqueId}";

            // VIP logic
            ProfilePageVipStar.Visibility = profile.IsVip ? Visibility.Visible : Visibility.Collapsed;
            ProfilePageVipBadge.Visibility = profile.IsVip ? Visibility.Visible : Visibility.Collapsed;
            VipPromoSection.Visibility = profile.IsVip ? Visibility.Collapsed : Visibility.Visible;
            
            if (profile.IsVip && profile.VipUntil.HasValue)
            {
                var expiryDate = DateTimeOffset.FromUnixTimeSeconds(profile.VipUntil.Value).LocalDateTime;
                VipExpiryText.Text = $"VIP то: {expiryDate:dd.MM.yyyy}";
            }

            // Stats
            ProfilePageGuestsCount.Text = profile.GuestsCount.ToString();
            ProfilePageFollowersCount.Text = profile.FollowersCount.ToString();
            ProfilePageFollowingCount.Text = profile.FollowingCount.ToString();

            // Details
            ProfilePageBio.Text = profile.Bio;
            ProfilePageBio.Visibility = string.IsNullOrEmpty(profile.Bio) ? Visibility.Collapsed : Visibility.Visible;
            ProfilePageGender.Text = string.IsNullOrEmpty(profile.Gender) ? "Муайян нашудааст" : profile.Gender;
            ProfilePageLocation.Text = string.IsNullOrEmpty(profile.Location) ? "Тоҷикистон" : profile.Location;
            ProfilePageNativeLang.Text = string.IsNullOrEmpty(profile.NativeLanguage) ? "Тоҷикӣ" : profile.NativeLanguage;
            ProfilePageLearningLang.Text = string.IsNullOrEmpty(profile.LearningLanguage) ? "English" : profile.LearningLanguage;

            // Interests
            if (profile.Interests != null)
            {
                var interestIcons = new Dictionary<string, string>
                {
                    { "TRAVEL", "✈️" }, { "READING", "📚" }, { "SPORTS", "⚽" }, { "MUSIC", "🎵" },
                    { "MOVIES", "🎬" }, { "COOKING", "🍳" }, { "PHOTOGRAPHY", "📷" }, { "GAMING", "🎮" },
                    { "ART", "🎨" }, { "TECHNOLOGY", "💻" }, { "FITNESS", "💪" }, { "NATURE", "🌿" }
                };

                foreach (var interestObj in profile.Interests)
                {
                    string interest = interestObj.Key ?? interestObj.Name ?? "";
                    if (string.IsNullOrEmpty(interest)) continue;

                    var icon = interestIcons.ContainsKey(interest.ToUpper()) ? interestIcons[interest.ToUpper()] : "🏷️";
                    var border = new Border
                    {
                        Margin = new Microsoft.UI.Xaml.Thickness(0, 0, 8, 8),
                        Background = (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["LayerFillColorAltBrush"],
                        CornerRadius = new CornerRadius(20),
                        Padding = new Microsoft.UI.Xaml.Thickness(12, 6, 12, 6),
                        BorderBrush = (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["SurfaceStrokeColorDefaultBrush"],
                        BorderThickness = new Microsoft.UI.Xaml.Thickness(1)
                    };
                    var stack = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
                    stack.Children.Add(new TextBlock { Text = icon });
                    stack.Children.Add(new TextBlock { Text = interest, FontSize = 13 });
                    border.Child = stack;
                    ProfileInterestsGrid.Children.Add(border);
                }
            }

            // Avatar
            string? url = !string.IsNullOrEmpty(profile.PhotoUrl) ? profile.PhotoUrl : profile.PhotoUrlFallback;
            var source = GetSafeImageSource(url);
            if (source != null) ProfilePageAvatar.ProfilePicture = source;

            // Load Posts
            var posts = await _apiService.GetCommunityPostsAsync(userId);
            if (posts != null)
            {
                foreach (var post in posts) ProfilePosts.Add(new CommunityPostViewModel(post));
                ProfilePostsList.ItemsSource = ProfilePosts;
            }
        }

        private void LogoutButton_Click(object sender, RoutedEventArgs e)
        {
            // Simple logout: clear session and go back to login
            string settingsPath = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ChatmeWindows", "session.json");
            if (System.IO.File.Exists(settingsPath)) System.IO.File.Delete(settingsPath);
            
            Frame.Navigate(typeof(LoginView));
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

        private void ProfileHeader_Tapped(object sender, Microsoft.UI.Xaml.Input.TappedRoutedEventArgs e)
        {
            // Switch to Profile view
            ExploreView.Visibility = Visibility.Collapsed;
            MessagesView.Visibility = Visibility.Collapsed;
            CommunityView.Visibility = Visibility.Collapsed;
            GuestsView.Visibility = Visibility.Collapsed;
            VoiceRoomsView.Visibility = Visibility.Collapsed;
            LearningView.Visibility = Visibility.Collapsed;
            LeaderboardView.Visibility = Visibility.Collapsed;
            TabSelectorGrid.Visibility = Visibility.Collapsed;
            
            ProfileView.Visibility = Visibility.Visible;
            UpdateProfilePageView();

            // Deselect items in Nav to avoid confusion
            MainNav.SelectedItem = null;
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
            LearningView.Visibility = Visibility.Collapsed;
            LeaderboardView.Visibility = Visibility.Collapsed;
            TabSelectorGrid.Visibility = Visibility.Collapsed;
            ProfileView.Visibility = Visibility.Collapsed;

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
                case "Learning":
                    LearningView.Visibility = Visibility.Visible;
                    _ = LoadLearning();
                    break;
                case "Leaderboard":
                    LeaderboardView.Visibility = Visibility.Visible;
                    _ = LoadLeaderboard();
                    break;
                case "Profile":
                    ProfileView.Visibility = Visibility.Visible;
                    UpdateProfilePageView();
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
            VipStarHeader.Visibility = Visibility.Collapsed; // Default
            PartnerOnlineIndicator.Visibility = Visibility.Collapsed;
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
            var history = await _apiService.GetMessagesAsync(_currentUser?.User.Id ?? 0, userId);
            Messages.Clear();
            foreach (var m in history)
            {
                Messages.Add(new MessageViewModel(m, _currentUser?.User.Id ?? 0));
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
                VipStarHeader.Visibility = selected.VipVisibility;
                PartnerOnlineIndicator.Visibility = selected.OnlineVisibility;
                ChatHeaderStatus.Text = selected.IsOnline ? "Online" : "Offline";
                
                var history = await _apiService.GetMessagesAsync(_currentUser?.User.Id ?? 0, selected.PartnerId);
                Messages.Clear();
                foreach (var m in history)
                {
                    Messages.Add(new MessageViewModel(m, _currentUser?.User.Id ?? 0));
                }
                
                if (Messages.Count > 0)
                {
                    MessageListView.ScrollIntoView(Messages.LastOrDefault());
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
            var newMsg = new MessageViewModel(text, true, DateTime.Now, "sending");
            Messages.Add(newMsg);
            MessageListView.ScrollIntoView(newMsg);
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

        // ===================== LEARNING =====================

        private async Task LoadLearning()
        {
            if (_currentUser == null) return;

            var statsTask = _apiService.GetLearningStatsAsync();
            var cardsTask = _apiService.GetFlashcardsAsync();

            await Task.WhenAll(statsTask, cardsTask);

            var stats = await statsTask;
            var cardsResp = await cardsTask;

            if (stats != null)
            {
                StreakText.Text = stats.Streak.ToString();
                LearningXpText.Text = stats.Xp.ToString();
                CorrectionsText.Text = stats.TotalCorrections.ToString();
            }

            Flashcards.Clear();
            _dueCards.Clear();

            if (cardsResp?.Flashcards != null)
            {
                TotalCardsText.Text = cardsResp.Flashcards.Count.ToString();
                var now = DateTime.UtcNow;

                foreach (var card in cardsResp.Flashcards)
                {
                    Flashcards.Add(new FlashcardViewModel(card));

                    // Due if next_review is null or in the past
                    bool isDue = string.IsNullOrEmpty(card.NextReview) ||
                                 DateTime.TryParse(card.NextReview, out var nextReview) && nextReview <= now;
                    if (isDue) _dueCards.Add(card);
                }
            }

            FlashcardDueText.Text = $"Шумо {_dueCards.Count} корт барои такрор доред";
            StartStudyButton.IsEnabled = _dueCards.Count > 0;
            _currentCardIndex = 0;
            _showingAnswer = false;

            // Reset study card state to ready
            FlashcardReadyText.Visibility = Visibility.Visible;
            FlashcardDueText.Visibility = Visibility.Visible;
            FlashcardContentText.Visibility = Visibility.Collapsed;
            FlashcardHintText.Visibility = Visibility.Visible;
            StartStudyPanel.Visibility = Visibility.Visible;
            GradeButtonsPanel.Visibility = Visibility.Collapsed;
        }

        private void StartStudyButton_Click(object sender, RoutedEventArgs e)
        {
            if (_dueCards.Count == 0) return;
            _currentCardIndex = 0;
            ShowCurrentCard();
        }

        private void ShowCurrentCard()
        {
            if (_currentCardIndex >= _dueCards.Count)
            {
                // Session done
                FlashcardReadyText.Text = "🎉 Сессия ба анҷом расид!";
                FlashcardDueText.Text = "Офарин! Ҳамаи кортҳоро такрор кардед.";
                FlashcardReadyText.Visibility = Visibility.Visible;
                FlashcardDueText.Visibility = Visibility.Visible;
                FlashcardContentText.Visibility = Visibility.Collapsed;
                FlashcardHintText.Visibility = Visibility.Collapsed;
                StartStudyPanel.Visibility = Visibility.Visible;
                GradeButtonsPanel.Visibility = Visibility.Collapsed;
                return;
            }

            _showingAnswer = false;
            var card = _dueCards[_currentCardIndex];

            FlashcardReadyText.Visibility = Visibility.Collapsed;
            FlashcardDueText.Visibility = Visibility.Collapsed;
            FlashcardContentText.Text = card.Front;
            FlashcardContentText.Visibility = Visibility.Visible;
            FlashcardHintText.Text = "Барои дидани ҷавоб клик кунед";
            FlashcardHintText.Visibility = Visibility.Visible;
            StartStudyPanel.Visibility = Visibility.Collapsed;
            GradeButtonsPanel.Visibility = Visibility.Collapsed;
        }

        private void FlashcardBorder_Tapped(object sender, Microsoft.UI.Xaml.Input.TappedRoutedEventArgs e)
        {
            if (_currentCardIndex >= _dueCards.Count) return;
            if (StartStudyPanel.Visibility == Visibility.Visible) return;

            if (!_showingAnswer)
            {
                // Show answer
                _showingAnswer = true;
                var card = _dueCards[_currentCardIndex];
                FlashcardContentText.Text = card.Back;
                FlashcardHintText.Visibility = Visibility.Collapsed;
                GradeButtonsPanel.Visibility = Visibility.Visible;
            }
        }

        private async void GradeButton_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button btn && int.TryParse(btn.Tag?.ToString(), out int grade))
            {
                var card = _dueCards[_currentCardIndex];
                await _apiService.UpdateFlashcardReviewAsync(card.Id, grade);
                _currentCardIndex++;
                ShowCurrentCard();
            }
        }

        private async void AddFlashcardButton_Click(object sender, RoutedEventArgs e)
        {
            var frontBox = new TextBox { PlaceholderText = "Калима ё ибора...", Margin = new Microsoft.UI.Xaml.Thickness(0, 0, 0, 8) };
            var backBox = new TextBox { PlaceholderText = "Тарҷума ё маъно..." };
            var panel = new StackPanel { Children = { frontBox, backBox } };

            var dialog = new ContentDialog
            {
                Title = "Иловаи корти нав",
                Content = panel,
                PrimaryButtonText = "Сабт",
                CloseButtonText = "Бекор кардан",
                XamlRoot = this.XamlRoot
            };

            var result = await dialog.ShowAsync();
            if (result == ContentDialogResult.Primary)
            {
                string front = frontBox.Text.Trim();
                string back = backBox.Text.Trim();
                if (!string.IsNullOrEmpty(front) && !string.IsNullOrEmpty(back))
                {
                    await _apiService.CreateFlashcardAsync(front, back);
                    await LoadLearning();
                }
            }
        }

        private async void DeleteFlashcard_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button btn && btn.Tag is int id)
            {
                await _apiService.DeleteFlashcardAsync(id);
                await LoadLearning();
            }
        }

        // ===================== LEADERBOARD =====================

        private async Task LoadLeaderboard()
        {
            var data = await _apiService.GetLeaderboardAsync();
            if (data == null) return;

            LeaderboardItems.Clear();
            for (int i = 0; i < data.TopUsers.Count; i++)
            {
                LeaderboardItems.Add(new LeaderboardItemViewModel(data.TopUsers[i], i + 1));
            }

            if (data.CurrentUser != null)
            {
                MyRankCard.Visibility = Visibility.Visible;
                MyRankText.Text = $"#{data.CurrentUser.Rank}";
                MyLeaderNameText.Text = data.CurrentUser.Name;
                MyLeaderLevelText.Text = $"Lvl {data.CurrentUser.Level}";
                MyLeaderXpText.Text = $"{data.CurrentUser.Xp} XP";
                MyLeaderAvatar.ProfilePicture = GetSafeImageSource(data.CurrentUser.Avatar);
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

    // ===================== LEARNING VIEW MODELS =====================

    public class FlashcardViewModel
    {
        public int Id { get; }
        public string Front { get; }
        public string Back { get; }
        public FlashcardViewModel(FlashcardDto dto) { Id = dto.Id; Front = dto.Front; Back = dto.Back; }
    }

    // ===================== LEADERBOARD VIEW MODELS =====================

    public class LeaderboardItemViewModel
    {
        public string Name { get; }
        public string RankDisplay { get; }
        public string LevelText { get; }
        public string XpText { get; }
        public Microsoft.UI.Xaml.Media.ImageSource? AvatarSource { get; }

        public LeaderboardItemViewModel(LeaderboardUserDto dto, int rank)
        {
            Name = dto.Name;
            RankDisplay = rank == 1 ? "🥇" : rank == 2 ? "🥈" : rank == 3 ? "🥉" : $"#{rank}";
            LevelText = $"Lvl {dto.Level}";
            XpText = $"{dto.Xp} XP";

            string? url = dto.Avatar;
            if (!string.IsNullOrEmpty(url))
            {
                if (!url.StartsWith("http"))
                    url = url.StartsWith("/") ? $"https://shphbjeio23.chatme.tj{url}" : $"https://shphbjeio23.chatme.tj/{url}";
                if (Uri.TryCreate(url, UriKind.Absolute, out var uri))
                    AvatarSource = new Microsoft.UI.Xaml.Media.Imaging.BitmapImage(uri);
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

        public bool IsVip { get; set; }
        public bool IsOnline { get; set; }
        public Visibility VipVisibility => IsVip ? Visibility.Visible : Visibility.Collapsed;
        public Visibility OnlineVisibility => IsOnline ? Visibility.Visible : Visibility.Collapsed;

        public ConversationViewModel(ConversationDto dto)
        {
            PartnerId = dto.PartnerId;
            PartnerName = dto.PartnerName;
            LastMessage = dto.LastMessage;
            LastMessageTime = dto.LastMessageTime;
            UnreadCount = dto.UnreadCount;
            AvatarUrlString = dto.PartnerAvatar; 
            IsVip = dto.IsVip;
            IsOnline = dto.IsOnline;
        }
    }

    public class MessageViewModel
    {
        public string Content { get; set; } = string.Empty;
        public bool IsMe { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = "sent";
        public string MessageType { get; set; } = "text";

        public MessageViewModel(MessageDto dto, int currentUserId)
        {
            Content = dto.Content;
            IsMe = dto.SenderId == currentUserId;
            CreatedAt = DateTimeOffset.FromUnixTimeSeconds(dto.CreatedAt).LocalDateTime;
            Status = dto.Status ?? "sent";
            MessageType = dto.Type ?? "text";
        }

        public MessageViewModel(string content, bool isMe, DateTime createdAt, string status = "sent", string type = "text")
        {
            Content = content;
            IsMe = isMe;
            CreatedAt = createdAt;
            Status = status;
            MessageType = type;
        }

        public string TimeString => CreatedAt.ToString("HH:mm");

        public string StatusIcon => Status switch
        {
            "sending" => "🕒",
            "sent" => "✓",
            "read" => "✓✓",
            "failed" => "⚠️",
            _ => "✓"
        };

        public Visibility StatusVisibility => IsMe ? Visibility.Visible : Visibility.Collapsed;
        public Microsoft.UI.Xaml.Media.Brush StatusColor => Status == "read" 
            ? (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["SystemAccentColorBrush"] 
            : IsMe ? new Microsoft.UI.Xaml.Media.SolidColorBrush(Windows.UI.Color.FromArgb(150, 255, 255, 255)) : (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["TextFillColorTertiaryBrush"];

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
            ? new Microsoft.UI.Xaml.Media.SolidColorBrush(Windows.UI.Color.FromArgb(180, 255, 255, 255)) 
            : (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["TextFillColorTertiaryBrush"];
            
        public CornerRadius BubbleRadius => IsMe
            ? new CornerRadius(18, 18, 4, 18)
            : new CornerRadius(18, 18, 18, 4);
    }
}
