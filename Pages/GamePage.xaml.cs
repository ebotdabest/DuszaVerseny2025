using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using DuszaVerseny2025.Engine;
using DuszaVerseny2025.Engine.Cards;
using DuszaVerseny2025.Engine.Utils;

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
        private TaskCompletionSource<bool> _resumeSignal;

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
            Debug.WriteLine($"C# Received Message: {e.Message}");

            if (e.Message == "startGameRequested")
            {
                if (!isGameRunning)
                {
                    isGameRunning = true;
                    await StartGame();
                }
            }
            else if (e.Message == "navigateBack")
            {
                await Shell.Current.GoToAsync("..");
            }
            else if (e.Message == "resumeGame")
            {
                _resumeSignal?.TrySetResult(true);
            }
            else if (e.Message.Contains("cardRoll"))
            {
                string side = e.Message.Split('|')[1];
                var card = RollForPowercard();
                var data = JsonSerializer.Serialize(card);
                hybridWebView.SendRawMessage($"rollDaCard|{}");
            }
        }

        public void SaveGame()
        {
            // Save the damn game
        }

        private async Task StartGame()
        {
            var startGameData = new StartGameData
            {
                PlayerDeck = new SimpleDeck { Cards = CurrentDeck.Cards.Select(c => new SimpleCard(c)).ToList() },
                Dungeon = new SimpleDungeon
                {
                    Name = Dungeon.Name,
                    HasBoss = Dungeon.HasBoss,
                    boss = new SimpleCard(Dungeon.boss)
                },
                DungeonDeck = dungeonDeck.Cards.Select(c => new SimpleCard(c)).ToList()
            };

            string json = JsonSerializer.Serialize(startGameData, GamePageJSContext.Default.StartGameData);
            hybridWebView.SendRawMessage($"startGame|{json}");


            var result = await MauiProgram.engine.GameWorld.FightDungeonButFancy(Dungeon, CurrentDeck, OnFightEvent);
            var gameOverData = new GameOverData
            {
                Success = result.Success,
                Reward = "idk"
            };
            string resultJson = JsonSerializer.Serialize(gameOverData, GamePageJSContext.Default.GameOverData);
            hybridWebView.SendRawMessage($"gameOver|{resultJson}");
            isGameRunning = false;
        }

        private async Task OnFightEvent(World.FightEvent ev)
        {
            var eventData = new FightEventData
            {
                event_name = ev.event_name,
                values = new Dictionary<string, object>()
            };
            foreach (var kvp in ev.values)
            {
                if (kvp.Value is Card c)
                {
                    eventData.values[kvp.Key] = new SimpleCard(c);
                }
                else
                {
                    eventData.values[kvp.Key] = kvp.Value;
                }
            }

            string json = JsonSerializer.Serialize(eventData, GamePageJSContext.Default.FightEventData);

            // CRITICAL: Dispatch UI operation to main thread to avoid cross-thread marshalling error
            await MainThread.InvokeOnMainThreadAsync(() =>
            {
                hybridWebView.SendRawMessage($"fightEvent|{json}");
            });

            if (ev.event_name.Contains("select")) await Task.Delay(500);
            else
            {
                _resumeSignal = new TaskCompletionSource<bool>();
                await Task.WhenAny(_resumeSignal.Task, Task.Delay(20000));
            }

        }

        Dictionary<string, string> ICONS = new()
        {
            {"DamagePower", "🔥"},
            {"HealPower", "💚"},
            {"ShieldPower", "🛡️"},
            {"StrengthPower", "💥"}
        };

        public struct PowerCardObject
        {
            public required string name { get; set; }
            public required string type { get; set; }
            public required string icon { get; set; }
            public required int value { get; set; }
            public required int duration { get; set; }
            public required string description { get; set; }
        }

        public PowerCardObject RollForPowercard()
        {
            Console.WriteLine("Sup");
            var powerCard = Utils.GetRandomCard(MauiProgram.engine.powerCards);
            return new PowerCardObject
            {
                name = powerCard.getName(),
                type = powerCard.GetType().Name,
                icon = ICONS.ContainsKey(powerCard.GetType().Name) ? ICONS[powerCard.GetType().Name] : "❓",
                value = powerCard.getValue(),
                duration = powerCard.getDuration(),
                description = "magic"
            };
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