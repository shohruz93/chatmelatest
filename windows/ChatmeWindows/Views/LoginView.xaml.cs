using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;
using ChatmeWindows.Services;
using Windows.Storage;

namespace ChatmeWindows.Views
{
    public sealed partial class LoginView : Page
    {
        private readonly ApiService _apiService = new();
        private readonly GoogleAuthService _googleAuth = new();
        private string _currentLang = "en-US";

        public LoginView()
        {
            this.InitializeComponent();
            LoadSettings();
        }

        private void LoadSettings()
        {
            try
            {
                var settings = ApplicationData.Current.LocalSettings.Values;
                if (settings.ContainsKey("Language"))
                {
                    _currentLang = settings["Language"]?.ToString() ?? "en-US";
                }
                // Wait for UI to initialize
                DispatcherQueue.TryEnqueue(() =>
                {
                    ApplyLanguage(_currentLang);
                    if (settings.ContainsKey("Theme"))
                    {
                        string theme = settings["Theme"]?.ToString() ?? "Dark";
                        RootGrid.RequestedTheme = theme == "Dark" ? ElementTheme.Dark : ElementTheme.Light;
                        ThemeToggleButton.Content = theme == "Dark" ? "🌙" : "☀️";
                    }
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error loading settings (unpackaged app?): {ex.Message}");
                ApplyLanguage(_currentLang);
            }
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
            ApplyLanguage(_currentLang);
        }

        private void ShowEmailInputPanel()
        {
            ChoosePanel.Visibility = Visibility.Collapsed;
            EmailInputPanel.Visibility = Visibility.Visible;
            CodeVerifyPanel.Visibility = Visibility.Collapsed;
            ApplyLanguage(_currentLang);
        }

        private void ShowCodeVerifyPanel(string email)
        {
            ChoosePanel.Visibility = Visibility.Collapsed;
            EmailInputPanel.Visibility = Visibility.Collapsed;
            CodeVerifyPanel.Visibility = Visibility.Visible;
            ApplyLanguage(_currentLang);
            
            if (_currentLang == "tg-TJ")
                CodeEmailText.Text = $"Мо кодро ба {email} фиристодем";
            else if (_currentLang == "ru-RU")
                CodeEmailText.Text = $"Мы отправили код на {email}";
            else
                CodeEmailText.Text = $"We sent a code to {email}";
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
                ErrorDisplay.Text = _currentLang == "tg-TJ" ? "Лутфан почтаро ворид кунед" : 
                                   _currentLang == "ru-RU" ? "Пожалуйста, введите email" : 
                                   "Please enter an email address";
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
                    ShowCodeVerifyPanel(email);
                }
                else
                {
                    ErrorDisplay.Text = _currentLang == "tg-TJ" ? "Хато дар фиристодани код" : 
                                       _currentLang == "ru-RU" ? "Ошибка при отправке кода" : 
                                       "Failed to send code. Please check your email.";
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
            ErrorDisplay.Visibility = Visibility.Collapsed;
            try
            {
                var response = await _apiService.LoginAsync(email, code);
                if (response != null)
                {
                    SaveSession(response);
                    this.Frame.Navigate(typeof(MainPage), response);
                }
                else
                {
                    ErrorDisplay.Text = _currentLang == "tg-TJ" ? "Коди нодуруст" : 
                                       _currentLang == "ru-RU" ? "Неверный код" : 
                                       "Invalid verification code";
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

        // Removed ResendCode_Click

        private async void GoogleLogin_Click(object sender, RoutedEventArgs e)
        {
            ErrorDisplay.Visibility = Visibility.Collapsed;
            LoadingOverlay.Visibility = Visibility.Visible;
            try
            {
                string? idToken = await _googleAuth.AuthenticateAsync();
                if (!string.IsNullOrEmpty(idToken))
                {
                    var response = await _apiService.LoginWithGoogleAsync(idToken);
                    if (response != null)
                    {
                        SaveSession(response);
                        this.Frame.Navigate(typeof(MainPage), response);
                    }
                    else
                    {
                        throw new Exception("Backend login failed");
                    }
                }
            }
            catch (Exception ex)
            {
                ErrorDisplay.Text = $"Google Login Error: {ex.Message}";
                ErrorDisplay.Visibility = Visibility.Visible;
            }
            finally
            {
                LoadingOverlay.Visibility = Visibility.Collapsed;
            }
        }

        private void SaveSession(AuthResponse response)
        {
            try
            {
                string settingsPath = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ChatmeWindows", "session.json");
                System.IO.Directory.CreateDirectory(System.IO.Path.GetDirectoryName(settingsPath)!);
                string json = System.Text.Json.JsonSerializer.Serialize(response);
                System.IO.File.WriteAllText(settingsPath, json);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error saving session: {ex.Message}");
            }
        }

        // --- THEME & LANG ---

        private void ThemeToggle_Click(object sender, RoutedEventArgs e)
        {
            var currentTheme = RootGrid.RequestedTheme == ElementTheme.Default ? this.ActualTheme : RootGrid.RequestedTheme;
            
            if (currentTheme == ElementTheme.Dark)
            {
                RootGrid.RequestedTheme = ElementTheme.Light;
                ThemeToggleButton.Content = "🌙"; // Show moon while in light mode, allowing to switch back to dark
                try { ApplicationData.Current.LocalSettings.Values["Theme"] = "Light"; } catch { }
            }
            else
            {
                RootGrid.RequestedTheme = ElementTheme.Dark;
                ThemeToggleButton.Content = "☀️"; // Show sun while in dark mode, allowing to switch back to light
                try { ApplicationData.Current.LocalSettings.Values["Theme"] = "Dark"; } catch { }
            }
        }

        private void Lang_Click(object sender, RoutedEventArgs e)
        {
            var item = sender as MenuFlyoutItem;
            if (item != null && item.Tag != null)
            {
                _currentLang = item.Tag.ToString() ?? "en-US";
                ApplyLanguage(_currentLang);
                try { ApplicationData.Current.LocalSettings.Values["Language"] = _currentLang; } catch { }
            }
        }

        private void ApplyLanguage(string lang)
        {
            if (lang == "tg-TJ")
            {
                LangButton.Content = "TJ";
                if (ChoosePanel.Visibility == Visibility.Visible)
                {
                    TitleText.Text = "Хуш омадед";
                    SubtitleText.Text = "Бо тамоми ҷаҳон пайваст шавед";
                }
                else if (EmailInputPanel.Visibility == Visibility.Visible)
                {
                    TitleText.Text = "Вруди Email";
                    SubtitleText.Text = "Бо суроғаи почтаи худ ворид шавед";
                }
                else
                {
                    TitleText.Text = "Тасдиқкунӣ";
                    SubtitleText.Text = "Коди 6-рақамаро ворид кунед";
                }
                
                EmailBox.Header = "Суроғаи почта";
                ((Button)ChoosePanel.Children[0]).Content = "Идома бо Google";
                ((Button)ChoosePanel.Children[1]).Content = "Идома бо Email";
                ((Button)EmailInputPanel.Children[1]).Content = "Фиристодани код";
                ((Button)EmailInputPanel.Children[2]).Content = "Қафо";
                ((PasswordBox)CodeVerifyPanel.Children[1]).Header = "Коди тасдиқ";
                ((Button)CodeVerifyPanel.Children[2]).Content = "Вуруд";
                ((Button)CodeVerifyPanel.Children[3]).Content = "Қафо";
            }
            else if (lang == "ru-RU")
            {
                LangButton.Content = "RU";
                if (ChoosePanel.Visibility == Visibility.Visible)
                {
                    TitleText.Text = "С возвращением";
                    SubtitleText.Text = "Общайтесь со всем миром";
                }
                else if (EmailInputPanel.Visibility == Visibility.Visible)
                {
                    TitleText.Text = "Вход по Email";
                    SubtitleText.Text = "Войдите с помощью вашей почты";
                }
                else
                {
                    TitleText.Text = "Верификация";
                    SubtitleText.Text = "Введите 6-значный код";
                }

                EmailBox.Header = "Электронная почта";
                ((Button)ChoosePanel.Children[0]).Content = "Войти через Google";
                ((Button)ChoosePanel.Children[1]).Content = "Войти через Email";
                ((Button)EmailInputPanel.Children[1]).Content = "Отправить код";
                ((Button)EmailInputPanel.Children[2]).Content = "Назад";
                ((PasswordBox)CodeVerifyPanel.Children[1]).Header = "Код подтверждения";
                ((Button)CodeVerifyPanel.Children[2]).Content = "Войти";
                ((Button)CodeVerifyPanel.Children[3]).Content = "Назад";
            }
            else
            {
                LangButton.Content = "EN";
                if (ChoosePanel.Visibility == Visibility.Visible)
                {
                    TitleText.Text = "Welcome Back";
                    SubtitleText.Text = "Connect with the world";
                }
                else if (EmailInputPanel.Visibility == Visibility.Visible)
                {
                    TitleText.Text = "Email Login";
                    SubtitleText.Text = "Login with your email address";
                }
                else
                {
                    TitleText.Text = "Verification";
                    SubtitleText.Text = "Enter the 6-digit code";
                }

                EmailBox.Header = "Email Address";
                ((Button)ChoosePanel.Children[0]).Content = "Continue with Google";
                ((Button)ChoosePanel.Children[1]).Content = "Continue with Email";
                ((Button)EmailInputPanel.Children[1]).Content = "Send Code";
                ((Button)EmailInputPanel.Children[2]).Content = "Back";
                ((PasswordBox)CodeVerifyPanel.Children[1]).Header = "Verification Code";
                ((Button)CodeVerifyPanel.Children[2]).Content = "Login";
                ((Button)CodeVerifyPanel.Children[3]).Content = "Back";
            }
        }
    }
}
