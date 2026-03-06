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
        // Read secrets from environment variables or configuration to avoid committing them to source control.
        private static string ClientId => Environment.GetEnvironmentVariable("GOOGLE_OAUTH_CLIENT_ID") ?? "YOUR_GOOGLE_CLIENT_ID"; 
        private static string ClientSecret => Environment.GetEnvironmentVariable("GOOGLE_OAUTH_CLIENT_SECRET") ?? "YOUR_GOOGLE_CLIENT_SECRET";

        // Use a fixed loopback redirect URI and PKCE-enabled Authorization Code flow.
        public async Task<string?> AuthenticateAsync()
        {
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
                             $"client_id={ClientId}&" +
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
                new KeyValuePair<string,string>("client_id", ClientId),
                new KeyValuePair<string,string>("client_secret", ClientSecret),
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
