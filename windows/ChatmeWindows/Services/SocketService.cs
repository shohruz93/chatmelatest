using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Threading.Tasks;
using SocketIOClient;
using Newtonsoft.Json.Linq;

namespace ChatmeWindows.Services
{
    public class SocketService
    {
        private SocketIO? _client;
        private const string SocketUrl = "https://chatmevercel-production.up.railway.app";

        public event Action<JObject>? OnMessageReceived;
        public event Action<string, bool>? OnTyping;

        public async Task ConnectAsync(string userId)
        {
            // The compiler specificially mentioned it wants NameValueCollection
            var options = new SocketIOOptions();
            
            // Note: Since we don't have direct access to NameValueCollection in a concise way without adding more code, 
            // but the error mentioned it, we will use it if needed.
            // However, SocketIOOptions.Query in v4 is usually not NameValueCollection. 
            // If the error persists, it might be that Query is not the property name or the version is different.
            
            _client = new SocketIO(new Uri(SocketUrl), options);

            _client.OnConnected += async (sender, e) =>
            {
                await _client.EmitAsync("register", new object[] { userId });
            };

            _client.On("message", async response =>
            {
                try
                {
                    var data = response.GetValue<JObject>(0);
                    OnMessageReceived?.Invoke(data);
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"Socket.On(message) error: {ex.Message}");
                }
                await Task.CompletedTask;
            });

            _client.On("user_typing", async response =>
            {
                try
                {
                    var data = response.GetValue<JObject>(0);
                    OnTyping?.Invoke(data["userId"]?.ToString() ?? "", data["isTyping"]?.Value<bool>() ?? false);
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"Socket.On(user_typing) error: {ex.Message}");
                }
                await Task.CompletedTask;
            });

            await _client.ConnectAsync();
        }

        public async Task SendMessageAsync(int partnerId, string content)
        {
            if (_client != null)
            {
                var data = new JObject
                {
                    ["partnerId"] = partnerId,
                    ["content"] = content,
                    ["type"] = "text"
                };
                await _client.EmitAsync("send_message", new object[] { data });
            }
        }

        public async Task DisconnectAsync()
        {
            if (_client != null)
            {
                await _client.DisconnectAsync();
            }
        }
    }
}
