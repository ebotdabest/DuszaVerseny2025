using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using DuszaVerseny2025.Engine.Cards;
using DuszaVerseny2025.Engine.Editor;
using DuszaVerseny2025.Engine.Save;
using DuszaVerseny2025.Engine.Utils;

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

        public List<SaveManager.PlayerSave> RequestSaves()
        {
            var saves = SaveManager.GetSaves();
            return saves;
        }

        public List<SaveManager.WorldDungeonCombo> RequestWorlds()
        {
            var worlds = SaveManager.GetWorlds().ToList();
            System.Console.WriteLine(worlds.Count);
            return worlds;
        }

        public SaveManager.PlayerSave LoadGameById(int saveId)
        {
            var save = SaveManager.LoadPlayerSave(saveId);
            var (world, dungeons) = SaveManager.LoadWorld(save.saveBase);
            var engine = DungeonEditor.loadFromWorld(world, dungeons).CompileMockEngine();
            MauiProgram.engine = engine;
            MauiProgram.deckBuilder.engine = engine;
            MauiProgram.currentSaveId = save.saveId;
            MauiProgram.currentSaveName = save.saveName;

            foreach (var cardName in save.unlockedCards)
                MauiProgram.engine.PlayerInventory.AddToCollection(engine.CardTemplates.First(c => c.name == cardName));

            foreach (var cardName in save.selectedCards)
                MauiProgram.deckBuilder.Add(MauiProgram.engine.PlayerInventory.Cards.First(c => c.name == cardName));

            return save;
        }

        public void MakeNewGame(JsonElement o)
        {
            string saveName = o.GetProperty("name").GetString();
            int templateId = int.Parse(o.GetProperty("template").GetString());


            MauiProgram.currentSaveId = SaveManager.GetSaves().Count;
            System.Console.WriteLine($"Changed save id to {MauiProgram.currentSaveId}");
            MauiProgram.currentSaveName = saveName;

            var (world, dungeons) = SaveManager.LoadWorld(templateId);
            var editor = DungeonEditor.loadFromWorld(world, dungeons);

            var engine = editor.CompileMockEngine();
            MauiProgram.engine = engine;
            MauiProgram.deckBuilder.engine = engine;

            System.Console.WriteLine("Starting unlocked!");
            foreach (var cardName in world.starterDeck)
            {
                System.Console.WriteLine(cardName);
                MauiProgram.engine.PlayerInventory.AddToCollection(engine.CardTemplates.First(c => c.name == cardName));
            }

            SaveGame();
        }

        public void SaveGame()
        {
            SaveManager.SavePlayerSave(MauiProgram.currentSaveId, MauiProgram.engine, MauiProgram.currentSaveName);
        }

        // Strict editor logic START

        public DungeonEditor editor;
        public int currentlyEditing = -1;


        public void InitEditor()
        {
            currentlyEditing = SaveManager.GetWorlds().Length;
            editor = new DungeonEditor();
        }

        public void CreateCard(JsonElement json)
        {
            string name = json.GetProperty("name").GetString();
            int attack = json.GetProperty("attack").GetInt32();
            int health = json.GetProperty("health").GetInt32();
            CardTemplate.Type element = Utils.GetNamedType(json.GetProperty("element").GetString());
            bool isBoss = json.GetProperty("isBoss").GetBoolean();
            string bossName = json.GetProperty("bossName").GetString();

            CardTemplate template = new CardTemplate(attack, health, name, element);
            editor.cards.Add(template);
            if (isBoss)
            {
                Card.Attribute bossProficiency = Utils.GetAttributeByName(json.GetProperty("bossProficiency").GetString());
                editor.cards.Add(template.ToBoss(bossName, bossProficiency));
            }
        }

        public void SaveCurrentlyEditing(string saveName)
        {
            var engine = editor.CompileMockEngine();
            SaveManager.SaveWorld(currentlyEditing, engine, saveName);
        }


        // Strict editor logic END


        protected override async void OnAppearing()
        {
            base.OnAppearing();
            Debug.WriteLine("=== MainPage OnAppearing ===");

            // Give the WebView time to initialize
            await Task.Delay(1000);

            bool connected = false;
            for (int i = 0; i < 3; i++)
            {
                try
                {
                    await hybridWebView.EvaluateJavaScriptAsync("window.debugLog('[C#] Connection established', 'success')");
                    connected = true;
                    break;
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"Connection attempt {i + 1} failed: {ex.Message}");
                    await Task.Delay(500);
                }
            }

            if (connected)
            {
                // Restore logs
                try { await hybridWebView.EvaluateJavaScriptAsync("if(window.restoreLogs) window.restoreLogs();"); }
                catch (Exception ex) { Debug.WriteLine($"Failed to restore logs: {ex.Message}"); }

                // Request game state from JS on page load
                try
                {
                    await hybridWebView.EvaluateJavaScriptAsync("if(window.requestGameState) window.requestGameState();");
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"Failed to trigger requestGameState: {ex.Message}");
                }
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
            if (e.Message == "ExitProgram")
            {
                Environment.Exit(0);
            }
        }

        // Send complete game state to JavaScript
        private async Task SendGameStateToJS()
        {
            // try
            // {
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
            // }
            // catch (Exception ex)
            // {
            //     Debug.WriteLine($"ERROR in SendGameStateToJS: {ex.Message}");
            //     try
            //     {
            //         await hybridWebView.EvaluateJavaScriptAsync($"window.debugLog('[C#] Error sending state: {ex.Message}', 'error')");
            //     }
            //     catch { }
            // }
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
                Deck.fromCollection(MauiProgram.engine.PlayerInventory, MauiProgram.engine.currentDeck, out deck);

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