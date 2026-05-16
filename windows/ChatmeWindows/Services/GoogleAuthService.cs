using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace ChatmeWindows.Services
{
    public class GoogleAuthService
    {
        // Place your Google OAuth credentials in:
        // %LOCALAPPDATA%\ChatmeWindows\google_oauth.json
        // Content: { "client_id": "YOUR_ID.apps.googleusercontent.com", "client_secret": "YOUR_SECRET" }
        //
        // IMPORTANT: In Google Cloud Console:
        //   1. Create a credential of type "Desktop app" (NOT Web app)
        //   2. Add http://127.0.0.1:7777/ to "Authorized redirect URIs"

        private static (string clientId, string clientSecret) LoadCredentials()
        {
            // Try config file first
            try
            {
                string configPath = System.IO.Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "ChatmeWindows", "google_oauth.json");

                if (System.IO.File.Exists(configPath))
                {
                    var json = System.IO.File.ReadAllText(configPath);
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    var root = doc.RootElement;
                    string id = root.GetProperty("client_id").GetString() ?? "";
                    string secret = root.GetProperty("client_secret").GetString() ?? "";
                    if (!string.IsNullOrEmpty(id)) return (id, secret);
                }
            }
            catch { }

            // Built-in credentials (Desktop / installed app)
            return (
                "913664143897-cspfn5i09414ic379dhbejhinh8p3vat.apps.googleusercontent.com",
                "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"
            );
        }

        // Use a fixed loopback redirect URI and PKCE-enabled Authorization Code flow.
        public async Task<string?> AuthenticateAsync()
        {
            var (clientId, clientSecret) = LoadCredentials();
            if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
            {
                throw new Exception(
                    "Google OAuth credentials not found.\n\n" +
                    "Please create the file:\n" +
                    "%LOCALAPPDATA%\\ChatmeWindows\\google_oauth.json\n\n" +
                    "Content:\n" +
                    "{\n  \"client_id\": \"YOUR_ID.apps.googleusercontent.com\",\n  \"client_secret\": \"YOUR_SECRET\"\n}\n\n" +
                    "Get these from Google Cloud Console → APIs & Services → Credentials → Desktop App.");
            }

            string redirectUri = "http://127.0.0.1:7777/";
            using var listener = new HttpListener();
            listener.Prefixes.Add(redirectUri);
            try
            {
                listener.Start();
            }
            catch (HttpListenerException ex)
            {
                throw new Exception($"Failed to start local listener on {redirectUri}. Try running as Administrator or ensure the port is free. ({ex.Message})");
            }

            string codeVerifier = GenerateCodeVerifier();
            string codeChallenge = ComputeCodeChallenge(codeVerifier);

            string authUrl = $"https://accounts.google.com/o/oauth2/v2/auth?" +
                             $"client_id={clientId}&" +
                             $"redirect_uri={Uri.EscapeDataString(redirectUri)}&" +
                             $"response_type=code&" +
                             $"scope=openid%20email%20profile&" +
                             $"code_challenge={codeChallenge}&" +
                             $"code_challenge_method=S256&" +
                             $"access_type=offline&prompt=consent";

            OpenBrowser(authUrl);

            var context = await listener.GetContextAsync();
            var request = context.Request;
            var response = context.Response;

            string html = "<html><body style='font-family: sans-serif; text-align: center; margin-top: 100px;'><h2>Completing authentication...</h2></body></html>";
            byte[] buffer = Encoding.UTF8.GetBytes(html);
            response.ContentLength64 = buffer.Length;
            await response.OutputStream.WriteAsync(buffer, 0, buffer.Length);
            response.OutputStream.Close();

            string? code = request.QueryString["code"];

            if (string.IsNullOrEmpty(code))
            {
                listener.Stop();
                throw new Exception("Authorization failed or was cancelled. No code was returned.");
            }

            // Exchange code for tokens
            using var http = new HttpClient();
            var data = new[] {
                new KeyValuePair<string,string>("client_id", clientId),
                new KeyValuePair<string,string>("client_secret", clientSecret),
                new KeyValuePair<string,string>("code", code),
                new KeyValuePair<string,string>("grant_type", "authorization_code"),
                new KeyValuePair<string,string>("redirect_uri", redirectUri),
                new KeyValuePair<string,string>("code_verifier", codeVerifier)
            };

            var tokenResponse = await http.PostAsync("https://oauth2.googleapis.com/token", new FormUrlEncodedContent(data));
            var tokenContent = await tokenResponse.Content.ReadAsStringAsync();
            if (!tokenResponse.IsSuccessStatusCode)
            {
                listener.Stop();
                throw new Exception($"Token exchange failed: {tokenResponse.StatusCode} - {tokenContent}");
            }

            using var doc = JsonDocument.Parse(tokenContent);
            if (doc.RootElement.TryGetProperty("id_token", out var idTokenEl))
            {
                listener.Stop();
                return idTokenEl.GetString();
            }

            listener.Stop();
            return null;
        }

        private static void OpenBrowser(string url)
        {
            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch
            {
                url = url.Replace("&", "^&");
                Process.Start(new ProcessStartInfo("cmd", $"/c start {url}") { CreateNoWindow = true });
            }
        }

        private static string GenerateCodeVerifier()
        {
            // 64 bytes -> base64url ~86 chars, within PKCE limits
            var bytes = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(bytes);
            return Base64UrlEncode(bytes);
        }

        private static string ComputeCodeChallenge(string codeVerifier)
        {
            using var sha256 = SHA256.Create();
            var bytes = Encoding.ASCII.GetBytes(codeVerifier);
            var hash = sha256.ComputeHash(bytes);
            return Base64UrlEncode(hash);
        }

        private static string Base64UrlEncode(byte[] input)
        {
            return Convert.ToBase64String(input)
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');
        }
    }
}
