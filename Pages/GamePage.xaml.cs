using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using DuszaVerseny2025.Engine;
using DuszaVerseny2025.Engine.Cards;
using Microsoft.Maui.Controls;

namespace DuszaVerseny2025
{
    [QueryProperty(nameof(CurrentDeck), "Deck")]
    [QueryProperty(nameof(Dungeon), "Dungeon")]
    public partial class GamePage : ContentPage
    {
        public Deck CurrentDeck { get; set; }
        public Dungeon Dungeon { get; set; }

        private Deck dungeonDeck;
        private bool isGameRunning = false;

        public GamePage()
        {
            InitializeComponent();
            hybridWebView.SetInvokeJavaScriptTarget(this);
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();

            if (Dungeon == null || CurrentDeck == null)
            {
                Debug.WriteLine("Dungeon or Deck is null!");
                return;
            }

            dungeonDeck = Dungeon.compileDeck();

            // Wait for WebView to be ready
            await Task.Delay(500);

            // Navigate to game.html
            await hybridWebView.EvaluateJavaScriptAsync("window.location.href = 'game.html';");
            
            // Wait a bit more for the page to load
            await Task.Delay(300);

            SendGameInitData();
        }

        private void SendGameInitData()
        {
            var initData = new GameInitData
            {
                DungeonName = Dungeon.Name
            };
            string json = JsonSerializer.Serialize(initData, GamePageJSContext.Default.GameInitData);
            hybridWebView.SendRawMessage($"initializeGame|{json}");
        }

        private async void OnHybridWebViewRawMessageReceived(object sender, HybridWebViewRawMessageReceivedEventArgs e)
        {
            string message = e.Message;
            Debug.WriteLine($"GamePage received: {message}");

            if (message == "startGameRequested")
            {
                await StartGame();
            }
            else if (message == "navigateBack")
            {
                await MainThread.InvokeOnMainThreadAsync(async () =>
                {
                    await Shell.Current.GoToAsync("..");
                });
            }
        }

        private async Task StartGame()
        {
            if (isGameRunning) return;
            isGameRunning = true;

            try
            {
                await hybridWebView.EvaluateJavaScriptAsync("window.debugLog('[C#] StartGame called', 'info')");

                if (CurrentDeck == null)
                {
                    await hybridWebView.EvaluateJavaScriptAsync("window.debugLog('[C#] StartGame failed: CurrentDeck is null', 'error')");
                    return;
                }
                if (Dungeon == null)
                {
                    await hybridWebView.EvaluateJavaScriptAsync("window.debugLog('[C#] StartGame failed: Dungeon is null', 'error')");
                    return;
                }
                if (dungeonDeck == null)
                {
                    await hybridWebView.EvaluateJavaScriptAsync("window.debugLog('[C#] StartGame failed: dungeonDeck is null', 'error')");
                    return;
                }

                await hybridWebView.EvaluateJavaScriptAsync("window.debugLog('[C#] Creating SimplePlayerDeck...', 'info')");
                var simplePlayerDeck = new SimpleDeck 
                { 
                    Cards = CurrentDeck.Cards.Select(c => new SimpleCard(c)).ToList() 
                };

                await hybridWebView.EvaluateJavaScriptAsync("window.debugLog('[C#] Creating SimpleDungeonDeck...', 'info')");
                var simpleDungeonDeck = dungeonDeck.Cards.Select(c => new SimpleCard(c)).ToList();
                
                await hybridWebView.EvaluateJavaScriptAsync("window.debugLog('[C#] Creating StartGameData...', 'info')");
                var gameData = new StartGameData
                {
                    PlayerDeck = simplePlayerDeck,
                    Dungeon = new SimpleDungeon 
                    { 
                        Name = Dungeon.Name, 
                        HasBoss = Dungeon.HasBoss, 
                        boss = new SimpleCard(Dungeon.boss) 
                    },
                    DungeonDeck = simpleDungeonDeck
                };

                await hybridWebView.EvaluateJavaScriptAsync("window.debugLog('[C#] Serializing StartGameData...', 'info')");
                string json = JsonSerializer.Serialize(gameData, GamePageJSContext.Default.StartGameData);

                await hybridWebView.EvaluateJavaScriptAsync("window.debugLog('[C#] Sending startGame message...', 'info')");
                hybridWebView.SendRawMessage($"startGame|{json}");

                // Start the fight in the engine
                await hybridWebView.EvaluateJavaScriptAsync("window.debugLog('[C#] Starting fight engine...', 'info')");
                var result = await MauiProgram.engine.GameWorld.FightDungeonButFancy(Dungeon, CurrentDeck, OnFightEvent);
                
                // Handle Game Over
                string rewardText = "";
                if (result.Success)
                {
                    rewardText = Dungeon.Reward.Grant(MauiProgram.engine.PlayerInventory, MauiProgram.engine.PlayerInventory.Cards.Where(t => t.name == result.lastCard).First());
                }

                var gameOverData = new GameOverData
                {
                    Success = result.Success,
                    Reward = rewardText
                };
                string resultJson = JsonSerializer.Serialize(gameOverData, GamePageJSContext.Default.GameOverData);
                hybridWebView.SendRawMessage($"gameOver|{resultJson}");
            }
            catch (Exception ex)
            {
                await hybridWebView.EvaluateJavaScriptAsync($"window.debugLog('[C#] CRASH IN STARTGAME: {ex.Message}', 'error')");
                Debug.WriteLine($"CRASH IN STARTGAME: {ex}");
            }
            finally
            {
                isGameRunning = false;
            }
        }

        private async Task OnFightEvent(World.FightEvent ev)
        {
            try 
            {
                Debug.WriteLine($"[C#] OnFightEvent: {ev.event_name}");

                // Map the engine event to a serializable format for JS
                var jsEvent = new FightEventData
                {
                    event_name = ev.event_name,
                    values = new Dictionary<string, object>()
                };

                foreach (var kvp in ev.values)
                {
                    if (kvp.Value is Card c)
                    {
                        jsEvent.values[kvp.Key] = new SimpleCard(c);
                    }
                    else
                    {
                        jsEvent.values[kvp.Key] = kvp.Value;
                    }
                }

                string json = JsonSerializer.Serialize(jsEvent, GamePageJSContext.Default.FightEventData);
                
                // Ensure message sending happens on the Main Thread
                MainThread.BeginInvokeOnMainThread(() => 
                {
                    hybridWebView.SendRawMessage($"fightEvent|{json}");
                });
                
                // Add delays to match the original pacing
                if (ev.event_name.Contains("select")) await Task.Delay(500);
                else await Task.Delay(400);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"CRASH IN ONFIGHTEVENT: {ex}");
            }
        }
    }

    public class SimpleCard
    {
        public string Name { get; set; }
        public int Damage { get; set; }
        public int Health { get; set; }
        public string ElementColor { get; set; }
        public bool IsBoss { get; set; }

        public SimpleCard() { }
        public SimpleCard(Card c)
        {
            if (c == null) return;
            Name = c.Name;
            Damage = c.Damage;
            Health = c.Health;
            ElementColor = c.Template?.ElementColor?.ToHex() ?? "#1a1a2e";
            IsBoss = c.Template?.IsBoss ?? false;
        }
    }

    public class SimpleDeck
    {
        public List<SimpleCard> Cards { get; set; }
    }

    public class SimpleDungeon
    {
        public string Name { get; set; }
        public bool HasBoss { get; set; }
        public SimpleCard boss { get; set; }
    }

    public class StartGameData
    {
        public SimpleDeck PlayerDeck { get; set; }
        public SimpleDungeon Dungeon { get; set; }
        public List<SimpleCard> DungeonDeck { get; set; }
    }

    public class GameInitData
    {
        public string DungeonName { get; set; }
    }


    public class GameOverData
    {
        public bool Success { get; set; }
        public string Reward { get; set; }
    }

    public class FightEventData
    {
        public string event_name { get; set; }
        public Dictionary<string, object> values { get; set; }
    }

    [JsonSourceGenerationOptions(WriteIndented = false)]
    [JsonSerializable(typeof(GameInitData))]
    [JsonSerializable(typeof(GameOverData))]
    [JsonSerializable(typeof(FightEventData))]
    [JsonSerializable(typeof(SimpleCard))]
    [JsonSerializable(typeof(SimpleDeck))]
    [JsonSerializable(typeof(StartGameData))]
    [JsonSerializable(typeof(object))]
    internal partial class GamePageJSContext : JsonSerializerContext
    {
    }
}