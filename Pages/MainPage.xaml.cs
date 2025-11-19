using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using DuszaVerseny2025.Engine;
using DuszaVerseny2025.Engine.Cards;

namespace DuszaVerseny2025
{
    public partial class MainPage : ContentPage
    {
        public static MainPage Current { get; private set; }

        public MainPage()
        {
            InitializeComponent();
            Current = this;

            hybridWebView.SetInvokeJavaScriptTarget(this);

            MessagingCenter.Subscribe<GamePage>(this, "DungeonWon", (sender) =>
            {
                // Refresh the UI after dungeon completion
                MainThread.BeginInvokeOnMainThread(async () =>
                {
                    await SendGameStateToJS();
                });
            });
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();
            Debug.WriteLine("=== MainPage OnAppearing ===");

            // Give the WebView time to initialize
            Debug.WriteLine("Waiting for WebView to initialize...");
            await Task.Delay(1000);

            // Try to establish connection with retries
            bool connected = false;
            for (int i = 0; i < 3; i++)
            {
                try
                {
                    Debug.WriteLine($"Connection attempt {i + 1}...");
                    await hybridWebView.EvaluateJavaScriptAsync("window.debugLog('[C#] Connection established', 'success')");
                    connected = true;
                    Debug.WriteLine($"Connection attempt {i + 1} SUCCESS");
                    break;
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"Connection attempt {i + 1} failed: {ex.Message}");
                    await Task.Delay(500);
                }
            }

            Debug.WriteLine($"Connection status: {connected}");

            if (connected)
            {
                Debug.WriteLine("Attempting to restore logs...");
                // Restore console logs
                try {
                    await hybridWebView.EvaluateJavaScriptAsync("if(window.restoreLogs) window.restoreLogs();");
                    Debug.WriteLine("Logs restored successfully");
                } catch (Exception ex) {
                    Debug.WriteLine($"Failed to restore logs: {ex.Message}");
                }

                Debug.WriteLine("Calling SendGameStateToJS...");
                try {
                    await SendGameStateToJS();
                    Debug.WriteLine("SendGameStateToJS completed");
                } catch (Exception ex) {
                    Debug.WriteLine($"SendGameStateToJS FAILED: {ex.Message}");
                    Debug.WriteLine($"Stack trace: {ex.StackTrace}");
                }
            }
            else
            {
                Debug.WriteLine("Failed to establish connection with WebView");
            }
            
            Debug.WriteLine("=== MainPage OnAppearing END ===");
        }

        private async void OnHybridWebViewRawMessageReceived(object sender, HybridWebViewRawMessageReceivedEventArgs e)
        {
            Debug.WriteLine($"Raw message received: {e.Message}");
            
            if (e.Message == "RequestGameState")
            {
                Debug.WriteLine("Received RequestGameState from JS");
                await SendGameStateToJS();
            }
        }

        // Send complete game state to JavaScript
        private async Task SendGameStateToJS()
        {
            try
            {
                Debug.WriteLine("=== SendGameStateToJS START ===");
                await hybridWebView.EvaluateJavaScriptAsync("window.debugLog('[C#] Preparing game state...', 'info')");

                var availableCards = MauiProgram.engine.CardTemplates
                    .Where(t => !t.IsBoss)
                    .Select((t, index) => new CardData
                    {
                        Index = index,
                        Name = t.name,
                        Attack = t.damage,
                        Health = t.health,
                        ElementColor = t.ElementColor?.ToHex() ?? "#1a1a2e",
                        IsOwned = MauiProgram.engine.PlayerInventory.Has(t),
                        IsSelected = MauiProgram.deckBuilder.Any(d => d.name == t.name)
                    }).ToList();

                var dungeons = MauiProgram.engine.GameWorld.Dungeons
                    .Select(d => new DungeonData
                    {
                        Name = d.name,
                        HasBoss = d.bossTemplate != null,
                        BossName = d.bossTemplate?.name,
                        BossHealth = d.bossTemplate?.health ?? 0,
                        BossDamage = d.bossTemplate?.damage ?? 0
                    }).ToList();

                var gameState = new GameStateData
                {
                    AvailableCards = availableCards,
                    Dungeons = dungeons,
                    MaxDeckSize = (int)MauiProgram.engine.PlayerInventory.CanUse,
                    CurrentDeckSize = MauiProgram.deckBuilder.Count
                };

                string json = JsonSerializer.Serialize(gameState, CardGameJSContext.Default.GameStateData);
                Debug.WriteLine($"JSON length: {json.Length}");

                await hybridWebView.EvaluateJavaScriptAsync($"window.updateGameState({json})");
                await hybridWebView.EvaluateJavaScriptAsync("window.debugLog('[C#] Game state sent successfully', 'success')");
                
                Debug.WriteLine("JavaScript call completed successfully");
                Debug.WriteLine("=== SendGameStateToJS END ===");
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"ERROR in SendGameStateToJS: {ex.Message}");
                try {
                    await hybridWebView.EvaluateJavaScriptAsync($"window.debugLog('[C#] Error sending state: {ex.Message}', 'error')");
                } catch {}
            }
        }

        // Called from JavaScript when a card is clicked
        public async Task<string> OnCardTapped(int cardIndex)
        {
            try
            {
                var template = MauiProgram.engine.CardTemplates.Where(t => !t.IsBoss).ElementAt(cardIndex);

                if (!MauiProgram.engine.PlayerInventory.Has(template))
                {
                    return JsonSerializer.Serialize(new { success = false, message = "Kártya nincs a birtokodban!" });
                }

                bool isSelected = MauiProgram.deckBuilder.Any(t => t.name == template.name);

                if (isSelected)
                {
                    // Deselect card
                    var toRemove = MauiProgram.deckBuilder.FirstOrDefault(t => t.name == template.name);
                    if (toRemove != null)
                    {
                        MauiProgram.deckBuilder.Remove(toRemove);
                    }
                }
                else
                {
                    // Select card
                    if (MauiProgram.deckBuilder.Count >= MauiProgram.engine.PlayerInventory.CanUse)
                    {
                        return JsonSerializer.Serialize(new
                        {
                            success = false,
                            message = $"Max {MauiProgram.engine.PlayerInventory.CanUse} kártya!"
                        });
                    }

                    var ownedCard = MauiProgram.engine.PlayerInventory.Cards
                        .FirstOrDefault(t => t.name == template.name);

                    if (ownedCard != null)
                    {
                        MauiProgram.deckBuilder.Add(ownedCard);
                    }
                }

                await SendGameStateToJS();
                return JsonSerializer.Serialize(new { success = true });
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error in OnCardTapped: {ex.Message}");
                return JsonSerializer.Serialize(new { success = false, message = "Hiba történt!" });
            }
        }

        // Called from JavaScript when a dungeon is selected
        public async Task<string> OnDungeonSelected(string dungeonName)
        {
            try
            {
                var dungeonTemplate = MauiProgram.engine.GameWorld.Dungeons
                    .FirstOrDefault(d => d.name == dungeonName);

                if (dungeonTemplate == null)
                {
                    return JsonSerializer.Serialize(new { success = false, message = "Dungeon nem található!" });
                }

                if (MauiProgram.deckBuilder.Count == 0)
                {
                    return JsonSerializer.Serialize(new
                    {
                        success = false,
                        message = "Legyen nálad legalább 1 kártya!"
                    });
                }

                var dungeon = MauiProgram.engine.GameWorld.generateDungeon(dungeonTemplate);

                Deck deck;
                Deck.fromCollection(MauiProgram.engine.PlayerInventory, MauiProgram.deckBuilder, out deck);

                var parameters = new Dictionary<string, object>
                {
                    ["Deck"] = deck,
                    ["Dungeon"] = dungeon
                };

                await MainThread.InvokeOnMainThreadAsync(async () =>
                {
                    await Shell.Current.GoToAsync(nameof(GamePage), parameters);
                });

                return JsonSerializer.Serialize(new { success = true });
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error in OnDungeonSelected: {ex.Message}");
                return JsonSerializer.Serialize(new { success = false, message = "Hiba történt!" });
            }
        }
    }

    // Data transfer classes
    public class GameStateData
    {
        public List<CardData> AvailableCards { get; set; }
        public List<DungeonData> Dungeons { get; set; }
        public int MaxDeckSize { get; set; }
        public int CurrentDeckSize { get; set; }
    }

    public class CardData
    {
        public int Index { get; set; }
        public string Name { get; set; }
        public int Attack { get; set; }
        public int Health { get; set; }
        public string ElementColor { get; set; }
        public bool IsOwned { get; set; }
        public bool IsSelected { get; set; }
    }

    public class DungeonData
    {
        public string Name { get; set; }
        public bool HasBoss { get; set; }
        public string BossName { get; set; }
        public int BossHealth { get; set; }
        public int BossDamage { get; set; }
    }

    // JSON serialization context
    [JsonSourceGenerationOptions(WriteIndented = false)]
    [JsonSerializable(typeof(GameStateData))]
    [JsonSerializable(typeof(CardData))]
    [JsonSerializable(typeof(DungeonData))]
    [JsonSerializable(typeof(string))]
    [JsonSerializable(typeof(int))]
    internal partial class CardGameJSContext : JsonSerializerContext
    {
    }
}