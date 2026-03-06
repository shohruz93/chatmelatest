using Microsoft.UI.Xaml.Navigation;

namespace ChatmeWindows
{
    /// <summary>
    /// Provides application-specific behavior to supplement the default Application class.
    /// </summary>
    public partial class App : Application
    {
        private Window? window;

        /// <summary>
        /// Initializes the singleton application object.  This is the first line of authored code
        /// executed, and as such is the logical equivalent of main() or WinMain().
        /// </summary>
        public App()
        {
            this.InitializeComponent();
        }

        protected override void OnLaunched(LaunchActivatedEventArgs e)
        {
            window ??= new Window();
            window.Title = "Chatme";

            // Resize window to be more mobile-like/narrow
            IntPtr hWnd = WinRT.Interop.WindowNative.GetWindowHandle(window);
            Microsoft.UI.WindowId windowId = Microsoft.UI.Win32Interop.GetWindowIdFromWindow(hWnd);
            Microsoft.UI.Windowing.AppWindow appWindow = Microsoft.UI.Windowing.AppWindow.GetFromWindowId(windowId);
            appWindow.Resize(new Windows.Graphics.SizeInt32 { Width = 450, Height = 750 });

            if (window.Content is not Frame rootFrame)
            {
                rootFrame = new Frame();
                rootFrame.NavigationFailed += OnNavigationFailed;
                window.Content = rootFrame;
            }

            // Check if user is already logged in
            bool isLoggedIn = false;
            ChatmeWindows.Services.AuthResponse? savedUser = null;
            try
            {
                string settingsPath = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ChatmeWindows", "session.json");
                if (System.IO.File.Exists(settingsPath))
                {
                    string json = System.IO.File.ReadAllText(settingsPath);
                    savedUser = System.Text.Json.JsonSerializer.Deserialize<ChatmeWindows.Services.AuthResponse>(json);
                    
                    if (savedUser != null && !string.IsNullOrEmpty(savedUser.Token))
                    {
                        isLoggedIn = true;
                    }
                }
            }
            catch (Exception ex)
            { 
               System.Diagnostics.Debug.WriteLine($"Error reading session: {ex.Message}");
            }

            if (isLoggedIn && savedUser != null)
            {
                _ = rootFrame.Navigate(typeof(Views.MainPage), savedUser);
            }
            else
            {
                _ = rootFrame.Navigate(typeof(Views.LoginView), e.Arguments);
            }
            window.Activate();
        }

        /// <summary>
        /// Invoked when Navigation to a certain page fails
        /// </summary>
        /// <param name="sender">The Frame which failed navigation</param>
        /// <param name="e">Details about the navigation failure</param>
        void OnNavigationFailed(object sender, NavigationFailedEventArgs e)
        {
            throw new Exception("Failed to load Page " + e.SourcePageType.FullName);
        }
    }
}
