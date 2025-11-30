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
    [QueryProperty(nameof(IsPath), "IsPath")]
    [QueryProperty(nameof(DungeonPath), "DungeonPath")]
    public partial class GamePage : ContentPage
    {
        public Deck CurrentDeck { get; set; }
        public Dungeon Dungeon { get; set; }
        public bool IsPath { get; set; }
        public DungeonPathTemplate? DungeonPath { get; set; } = null;

        private Deck dungeonDeck;
        private bool isGameRunning = false;
        private TaskCompletionSource<bool> _resumeSignal;

        public GamePage()
        {
            InitializeComponent();
            hybridWebView.SetInvokeJavaScriptTarget(this);
        }

        DungeonPath dungeonPathReal;

        protected override async void OnAppearing()
        {
            base.OnAppearing();

            if (!IsPath)
            {
                if (Dungeon == null || CurrentDeck == null)
                {
                    Debug.WriteLine("Dungeon or Deck is null!");
                    return;
                }

                dungeonDeck = Dungeon.compileDeck();

                // Wait for WebView to be ready
                await Task.Delay(800);
                // Navigate to game.html
                await hybridWebView.EvaluateJavaScriptAsync("window.location.href = 'game.html';");
                // Wait for page to fully load
                await Task.Delay(500);

                SendGameInitData();
            }
            else
            {
                dungeonPathReal = new DungeonPath(DungeonPath, CurrentDeck, OnFightEvent);

                Dungeon = Dungeon.fromTemplate(dungeonPathReal.Template.Dungeons[0]);

                SendGameInitData();
            }
        }

        struct CardStruct
        {
            public List<PowerCardObject> enemy { get; set; }
            public List<PowerCardObject> player { get; set; }
        }

        private void SendGameInitData()
        {
            var initData = new GameInitData
            {
                DungeonName = Dungeon.Name
            };
            string json = JsonSerializer.Serialize(initData, GamePageJSContext.Default.GameInitData);
            hybridWebView.SendRawMessage($"initializeGame|{json}");

            if (new Random().Next(0, 100000000) == new Random().Next(0, 67321))
            {

                List<PowerCard> playerCard = new();
                List<PowerCard> enemyCards = new();
                List<PowerCardObject> playerSer = new();
                List<PowerCardObject> enemySer = new();
                for (int i = 0; i < 3; i++)
                {
                    PowerCard pc;
                    var card = RollForPowercard(out pc);
                    playerCard.Add(pc);
                    playerSer.Add(card);
                }
                for (int i = 0; i < 3; i++)
                {
                    PowerCard pc;
                    var card = RollForPowercard(out pc);
                    enemyCards.Add(pc);
                    enemySer.Add(card);
                }

                var stuff = new CardStruct
                {
                    enemy = enemySer,
                    player = playerSer
                };


                hybridWebView.SendRawMessage($"sideCards|{JsonSerializer.Serialize(stuff)}");
            }

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
        }

        public void SaveGame()
        {
            // Save game logic here
        }

        private async Task StartGame()
        {
            if (!IsPath)
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

                string text = Dungeon.Reward.Grant(MauiProgram.engine.PlayerInventory, MauiProgram.engine.PlayerInventory.Cards.First(c => c.name == result.lastCard));

                var gameOverData = new GameOverData
                {
                    Success = result.Success,
                    Reward = text
                };
                string resultJson = JsonSerializer.Serialize(gameOverData, GamePageJSContext.Default.GameOverData);
                hybridWebView.SendRawMessage($"gameOver|{resultJson}");
                isGameRunning = false;
            }
            else
            {
                bool didWin = await dungeonPathReal.FightPath(MauiProgram.engine);
            }
        }

        private async Task OnFightEvent(World.FightEvent ev)
        {
            if (IsPath)
            {
                if (ev.event_name == "dungeonp:start")
                {
                    Dungeon = (Dungeon)ev.values["dungeon"];
                    dungeonDeck = Dungeon.compileDeck();

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

                    string hah = JsonSerializer.Serialize(startGameData, GamePageJSContext.Default.StartGameData);
                    hybridWebView.SendRawMessage($"startGame|{hah}");
                    return;
                }
                else if (ev.event_name == "dungeonp:dungeonwon")
                {
                    Dungeon = (Dungeon)ev.values["nextDungeon"];
                    dungeonDeck = Dungeon.compileDeck();

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

                    string hah = JsonSerializer.Serialize(startGameData, GamePageJSContext.Default.StartGameData);
                    hybridWebView.SendRawMessage($"startGame|{hah}");
                }
                else if (ev.event_name == "dungeonp:dungeonlost")
                {

                }
            }

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

            await MainThread.InvokeOnMainThreadAsync(() =>
            {
                hybridWebView.SendRawMessage($"fightEvent|{json}");
            });

            // Only wait for specific events that need animation time
            if (ev.event_name == "game:attack" || ev.event_name == "player:attack" ||
                ev.event_name.Contains("select"))
            {
                _resumeSignal = new TaskCompletionSource<bool>();
                await Task.WhenAny(_resumeSignal.Task, Task.Delay(10000)); // Reduced timeout
            }
            else if (ev.event_name == "round" || ev.event_name == "round_over")
            {
                // Short delay for round transitions - don't wait for resumeGame
                await Task.Delay(300);
            }
            else
            {
                // Minimal delay for other events
                await Task.Delay(100);
            }

            if (MauiProgram.engine.powerCards.Count > 0)
            {

                if (ev.event_name == "game:attack")
                {
                    System.Console.WriteLine("Checking for enemy powercard roll after attack!");
                    if (ev.values.ContainsKey("enemy") && ev.values["enemy"] is Card enemyCard && enemyCard.Health > 0)
                    {
                        Random r = new Random();
                        var idx = r.Next(0, enemyAbilities.Count);
                        enemyAbilities[idx].getName();
                        MainThread.InvokeOnMainThreadAsync(() =>
                        {
                            hybridWebView.EvaluateJavaScriptAsync("window.");
                        });
                    }
                }
                else if (ev.event_name == "player:attack")
                {
                    System.Console.WriteLine("Checking for player powercard roll after attack!");
                    if (ev.values.ContainsKey("card") && ev.values["card"] is Card playerCard && playerCard.Health > 0)
                    {

                    }
                }
            }
        }

        List<PowerCard> enemyAbilities = new List<PowerCard>();
        List<PowerCard> playerAbilities = new List<PowerCard>();

        async Task UsePowerCard(Card enemy, Card player, PowerCard card, bool isPlayer)
        {
            if (card.GetType() == typeof(HealPower))
            {
                if (isPlayer)
                {
                    card.ApplyEffect(player, enemy, isPlayer);
                }
                else
                {
                    card.ApplyEffect(enemy, player, isPlayer);
                }
            }
            else if (card.GetType() == typeof(StrengthPower))
            {
                if (isPlayer)
                {
                    playerAbilities.Add(card.Clone());
                }
                else
                {
                    enemyAbilities.Add(card.Clone());
                }
            }
            else if (card.GetType() == typeof(DamagePower))
            {
                card.ApplyEffect(player, enemy, isPlayer);
            }
            else if (card.GetType() == typeof(ShieldPower))
            {
                if (isPlayer)
                {
                    playerAbilities.Add(card.Clone());
                }
                else
                {
                    enemyAbilities.Add(card.Clone());
                }
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

        public PowerCardObject RollForPowercard(out PowerCard card)
        {
            var powerCard = Utils.GetRandomCard(MauiProgram.engine.powerCards);
            card = powerCard;
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
    [JsonSerializable(typeof(GamePage.PowerCardObject))]
    [JsonSerializable(typeof(object))]
    internal partial class GamePageJSContext : JsonSerializerContext
    {
    }
}