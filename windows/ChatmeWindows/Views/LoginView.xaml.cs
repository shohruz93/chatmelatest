using System;
using System.Threading.Tasks;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;
using ChatmeWindows.Services;

namespace ChatmeWindows.Views
{
    public sealed partial class LoginView : Page
    {
        private readonly ApiService _apiService = new();

        public LoginView()
        {
            this.InitializeComponent();
        }

        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            ShowChoosePanel();
        }

        private void ShowChoosePanel()
        {
            ChoosePanel.Visibility = Visibility.Visible;
            EmailInputPanel.Visibility = Visibility.Collapsed;
            CodeVerifyPanel.Visibility = Visibility.Collapsed;
            TitleText.Text = "Welcome Back";
            SubtitleText.Text = "Connect with the world";
        }

        private void ShowEmailInputPanel()
        {
            ChoosePanel.Visibility = Visibility.Collapsed;
            EmailInputPanel.Visibility = Visibility.Visible;
            CodeVerifyPanel.Visibility = Visibility.Collapsed;
            TitleText.Text = "Email Login";
            SubtitleText.Text = "Login with your email address";
        }

        private void ShowCodeVerifyPanel(string email)
        {
            ChoosePanel.Visibility = Visibility.Collapsed;
            EmailInputPanel.Visibility = Visibility.Collapsed;
            CodeVerifyPanel.Visibility = Visibility.Visible;
            CodeEmailText.Text = $"We sent a code to {email}";
            TitleText.Text = "Verification";
            SubtitleText.Text = "Enter the 6-digit code";
        }

        // --- NAVIGATION ---

        private void ShowEmailInput_Click(object sender, RoutedEventArgs e)
        {
            ShowEmailInputPanel();
        }

        private void BackToChoose_Click(object sender, RoutedEventArgs e)
        {
            ShowChoosePanel();
            ErrorDisplay.Visibility = Visibility.Collapsed;
        }

        // --- LOGIC ---

        private async void SendCode_Click(object sender, RoutedEventArgs e)
        {
            string email = EmailBox.Text;
            if (string.IsNullOrWhiteSpace(email))
            {
                ErrorDisplay.Text = "Please enter an email address";
                ErrorDisplay.Visibility = Visibility.Visible;
                return;
            }

            LoadingOverlay.Visibility = Visibility.Visible;
            ErrorDisplay.Visibility = Visibility.Collapsed;

            try
            {
                bool success = await _apiService.SendVerificationCodeAsync(email);
                if (success)
                {
                    CodeEmailText.Text = $"We sent a code to {email}";
                    ChoosePanel.Visibility = Visibility.Collapsed;
                    EmailInputPanel.Visibility = Visibility.Collapsed;
                    CodeVerifyPanel.Visibility = Visibility.Visible;
                    TitleText.Text = "Verification";
                    SubtitleText.Text = "Enter the 6-digit code";
                }
                else
                {
                    ErrorDisplay.Text = "Failed to send code. Please check your email.";
                    ErrorDisplay.Visibility = Visibility.Visible;
                }
            }
            catch (Exception ex)
            {
                ErrorDisplay.Text = $"Error: {ex.Message}";
                ErrorDisplay.Visibility = Visibility.Visible;
            }
            finally
            {
                LoadingOverlay.Visibility = Visibility.Collapsed;
            }
        }

        private async void VerifyCode_Click(object sender, RoutedEventArgs e)
        {
            string email = EmailBox.Text;
            string code = CodeBox.Password;

            if (string.IsNullOrWhiteSpace(code)) return;

            LoadingOverlay.Visibility = Visibility.Visible;
            try
            {
                var response = await _apiService.LoginAsync(email, code);
                if (response != null)
                {
                    this.Frame.Navigate(typeof(MainPage), response);
                }
                else
                {
                    ErrorDisplay.Text = "Invalid verification code";
                    ErrorDisplay.Visibility = Visibility.Visible;
                }
            }
            catch (Exception ex)
            {
                ErrorDisplay.Text = $"Login Error: {ex.Message}";
                ErrorDisplay.Visibility = Visibility.Visible;
            }
            finally
            {
                LoadingOverlay.Visibility = Visibility.Collapsed;
            }
        }

        private void ResendCode_Click(object sender, RoutedEventArgs e)
        {
            SendCode_Click(sender, e);
        }

        private void GoogleLogin_Click(object sender, RoutedEventArgs e)
        {
            // TODO: Native Google Login or WebView flow
            ErrorDisplay.Text = "Google Login is not implemented yet in this preview.";
            ErrorDisplay.Visibility = Visibility.Visible;
        }

        // --- THEME & LANG ---

        private void ThemeToggle_Click(object sender, RoutedEventArgs e)
        {
            if (this.ActualTheme == ElementTheme.Dark)
            {
                RootGrid.RequestedTheme = ElementTheme.Light;
                ThemeToggleButton.Content = "☀️";
            }
            else
            {
                RootGrid.RequestedTheme = ElementTheme.Dark;
                ThemeToggleButton.Content = "🌙";
            }
        }

        private void Lang_Click(object sender, RoutedEventArgs e)
        {
            if (sender is MenuFlyoutItem item && item.Tag != null && item.Text != null)
            {
                string lang = item.Tag.ToString() ?? "en-US";
                LangButton.Content = item.Text.Length >= 2 ? item.Text.Substring(0, 2) : "🌐";
            }
        }
    }
}
