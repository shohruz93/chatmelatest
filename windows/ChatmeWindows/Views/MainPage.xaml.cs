using System.Collections.ObjectModel;
using System.Threading.Tasks;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;
using ChatmeWindows.Services;
using Newtonsoft.Json.Linq;

namespace ChatmeWindows.Views
{
    public sealed partial class MainPage : Page
    {
        private AuthResponse? _currentUser;
        private readonly ApiService _apiService = new();
        private readonly SocketService _socketService = new();
        
        public ObservableCollection<ConversationDto> Conversations { get; } = new();
        public ObservableCollection<MessageViewModel> Messages { get; } = new();

        public MainPage()
        {
            this.InitializeComponent();
            ChatListView.ItemsSource = Conversations;
            MessageListView.ItemsSource = Messages;
        }

        protected override async void OnNavigatedTo(NavigationEventArgs e)
        {
            if (e.Parameter is AuthResponse response)
            {
                _currentUser = response;
                _apiService.SetToken(response.Token);
                await LoadConversations();
                await _socketService.ConnectAsync(response.User.Id.ToString());
                
                _socketService.OnMessageReceived += socketData =>
                {
                    this.DispatcherQueue.TryEnqueue(() =>
                    {
                        var msg = socketData.ToObject<MessageDto>();
                        if (msg != null)
                        {
                            Messages.Add(new MessageViewModel(msg.Content, msg.SenderId == _currentUser.User.Id));
                        }
                    });
                };
            }
        }

        private async Task LoadConversations()
        {
            if (_currentUser == null) return;
            var list = await _apiService.GetConversationsAsync(_currentUser.User.Id.ToString());
            Conversations.Clear();
            foreach (var item in list) Conversations.Add(item);
        }

        private async void ChatListView_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (ChatListView.SelectedItem is ConversationDto selected)
            {
                ChatHeader.Text = selected.PartnerName;
                var history = await _apiService.GetMessagesAsync(selected.PartnerId);
                Messages.Clear();
                foreach (var m in history)
                {
                    Messages.Add(new MessageViewModel(m.Content, m.SenderId == _currentUser?.User.Id));
                }
            }
        }

        private async void SendButton_Click(object sender, RoutedEventArgs e)
        {
            await SendMessage();
        }

        private async void MessageInput_KeyDown(object sender, Microsoft.UI.Xaml.Input.KeyRoutedEventArgs e)
        {
            if (e.Key == Windows.System.VirtualKey.Enter) await SendMessage();
        }

        private async Task SendMessage()
        {
            if (string.IsNullOrWhiteSpace(MessageInput.Text) || ChatListView.SelectedItem is not ConversationDto selected) return;

            string text = MessageInput.Text;
            MessageInput.Text = "";
            
            await _socketService.SendMessageAsync(selected.PartnerId, text);
            Messages.Add(new MessageViewModel(text, true));
        }
    }

    public class MessageViewModel
    {
        public string Content { get; set; } = string.Empty;
        public bool IsMe { get; set; }

        public MessageViewModel(string content, bool isMe)
        {
            Content = content;
            IsMe = isMe;
        }

        public HorizontalAlignment Alignment => IsMe ? HorizontalAlignment.Right : HorizontalAlignment.Left;
        public Microsoft.UI.Xaml.Media.Brush Background => IsMe 
            ? (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["SystemAccentColorBrush"] 
            : (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["SystemControlBackgroundChromeMediumBrush"];
    }
}
