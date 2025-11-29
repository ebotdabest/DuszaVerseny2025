using System.Diagnostics;
using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using DuszaVerseny2025.Engine;
using DuszaVerseny2025.Engine.Cards;
using DuszaVerseny2025.Engine.Editor;
using DuszaVerseny2025.Engine.Save;
using DuszaVerseny2025.Engine.Utils;

namespace DuszaVerseny2025
{
    public partial class MainPage : ContentPage
    {
        public static MainPage Current { get; private set; }

        private int GetNextSaveId()
        {
            var saves = SaveManager.GetSaves();

            if (saves == null || saves.Count == 0)
                return 0;

            return saves.Max(s => s.saveId) + 1;
        }

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
            var saves = SaveManager.GetSaves()
                                   .OrderBy(s => s.saveId)
                                   .ToList();
            return saves;
        }

        public List<SaveManager.WorldDungeonCombo> RequestWorlds()
        {
            var worlds = SaveManager.GetWorlds().ToList();
            return worlds;
        }

        public SaveManager.PlayerSave LoadGameById(int saveId)
        {
            MauiProgram.deckBuilder?.Clear();
            MauiProgram.engine = null;

            var save = SaveManager.LoadPlayerSave(saveId);
            var (world, dungeons) = SaveManager.LoadWorld(save.saveBase);

            var engine = DungeonEditor.loadFromWorld(world, dungeons).CompileMockEngine();
            MauiProgram.engine = engine;

            if (MauiProgram.deckBuilder != null)
                MauiProgram.deckBuilder.engine = engine;

            MauiProgram.currentSaveId = save.saveId;
            MauiProgram.currentSaveName = save.saveName;
            engine.GameWorld.SetBaseId(world.worldId);

            foreach (var cardName in save.unlockedCards)
            {
                var template = engine.CardTemplates.First(c => c.name == cardName);
                MauiProgram.engine.PlayerInventory.AddToCollection(template);
            }

            foreach (var cardName in save.selectedCards)
            {
                var ownedCard = MauiProgram.engine.PlayerInventory.Cards.First(c => c.name == cardName);
                MauiProgram.deckBuilder?.Add(ownedCard);
            }

            foreach (var upgrade in save.upgradedCards)
            {
                engine.PlayerInventory.Upgrade(upgrade.cardName, upgrade.healthDiff, upgrade.damageDiff);
                System.Console.WriteLine($"Setting {upgrade.cardName} to +{upgrade.healthDiff}; +{upgrade.damageDiff}");
            }

            return save;
        }

        public void MakeNewGame(JsonElement o)
        {
            string saveName = o.GetProperty("name").GetString();
            int templateId = int.Parse(o.GetProperty("template").GetString());

            MauiProgram.deckBuilder?.Clear();
            MauiProgram.engine = null;

            MauiProgram.currentSaveId = GetNextSaveId();
            System.Console.WriteLine($"New save id: {MauiProgram.currentSaveId}");
            MauiProgram.currentSaveName = saveName;

            var (world, dungeons) = SaveManager.LoadWorld(templateId);
            var editor = DungeonEditor.loadFromWorld(world, dungeons);

            var engine = editor.CompileMockEngine();
            MauiProgram.engine = engine;

            if (MauiProgram.deckBuilder != null)
                MauiProgram.deckBuilder.engine = engine;

            engine.GameWorld.SetBaseId(templateId);

            foreach (var cardName in world.starterDeck)
                MauiProgram.engine.PlayerInventory.AddToCollection(
                    engine.CardTemplates.First(c => c.name == cardName)
                );

            SaveGame();
        }

        public void SaveGame()
        {
            if (MauiProgram.currentSaveId == -1) return;
            SaveManager.SavePlayerSave(MauiProgram.currentSaveId, MauiProgram.engine, MauiProgram.currentSaveName);
        }

        public void UnloadGame()
        {
            MauiProgram.currentSaveName = "";
            MauiProgram.currentSaveId = -1;
            MauiProgram.engine = null;
            MauiProgram.deckBuilder.Clear();
        }

        // Strict editor logic START

        public DungeonEditor editor;
        public int currentlyEditing = -1;


        public void InitEditor()
        {
            currentlyEditing = SaveManager.GetWorlds().Length;
            editor = new DungeonEditor();
        }

        public bool CreateCard(JsonElement json)
        {
            string name = json.GetProperty("name").GetString();
            if (editor.cards.Any(c => c.name == name || c.bossName == name)) return false;
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

            return true;
        }

        public void SaveCurrentlyEditing(string saveName)
        {
            var engine = editor.CompileMockEngine();
            SaveManager.SaveWorld(currentlyEditing, engine, saveName);
        }

        public CardData[] GetEditorCards()
        {
            List<CardData> cards = new();
            for (int i = 0; i < editor.cards.Count; i++)
            {
                if (editor.cards[i].IsBoss) continue;
                cards.Add(new CardData
                {
                    Name = editor.cards[i].Name,
                    Attack = editor.cards[i].Attack,
                    Health = editor.cards[i].Health,
                    ElementColor = editor.cards[i].ElementColor.ToHex(),
                    IsOwned = true
                });
            }

            return cards.ToArray();
        }

        public CardData[] GetBossCards()
        {
            List<CardData> cards = new();

            foreach (CardTemplate boss in editor.cards.Where(c => c.IsBoss))
            {
                cards.Add(new CardData
                {
                    Name = boss.bossName,
                    Attack = boss.Attack,
                    Health = boss.Health,
                    ElementColor = boss.ElementColor.ToHex(),
                    IsOwned = true
                });
            }

            return cards.ToArray();
        }

        void CompleteRemove(CardTemplate card)
        {
            editor.cards.Remove(card);
            foreach (var collection in editor.collections) collection.collection.Purge(card);
            foreach (var dungeon in editor.dungeons)
            {
                dungeon.collection.Purge(card);
                if (dungeon.bossTemplate != null && dungeon.bossTemplate.bossName == card.bossName) dungeon.Orphan();
            }
        }

        public bool DeleteCard(JsonElement request)
        {
            string cardName = request.GetProperty("cardName").GetString();

            if (!editor.cards.Any(c => c.name == cardName)) return false;

            CardTemplate card = editor.cards.First(c => c.name == cardName);
            CompleteRemove(card);

            return true;
        }

        public bool DeleteBoss(JsonElement request)
        {
            string bossName = request.GetProperty("bossName").GetString();
            if (!editor.cards.Any(c => c.bossName == bossName)) return false;

            CardTemplate boss = editor.cards.First(c => c.bossName == bossName);
            CompleteRemove(boss);
            return true;
        }

        public bool CreateCollection(JsonElement json)
        {
            string name = json.GetProperty("name").GetString();
            if (editor.collections.Any(c => c.Name == name)) return false;

            List<CardTemplate> cards = new();
            foreach (var card in json.GetProperty("cards").EnumerateArray())
            {
                cards.Add(editor.cards.First(c => c.name == card.GetString()));
            }

            editor.collections.Add(new DungeonEditor.NamedCollection(cards, name));
            return true;
        }
        public struct CollectionData
        {
            public string Name { get; set; }
            public CardData[] Cards { get; set; }
        }

        public CollectionData[] GetCollections()
        {
            CollectionData[] collections = new CollectionData[editor.collections.Count];
            for (int i = 0; i < editor.collections.Count; i++)
            {
                List<CardData> cards = new();
                foreach (var card in editor.collections[i].collection.Cards)
                {
                    if (card.IsBoss) continue;
                    cards.Add(new CardData
                    {
                        Name = card.Name,
                        Attack = card.Attack,
                        Health = card.Health,
                        ElementColor = card.ElementColor.ToHex(),
                        IsOwned = true
                    });
                }
                collections[i] = new CollectionData
                {
                    Name = editor.collections[i].Name,
                    Cards = cards.ToArray()
                };
            }
            return collections;
        }

        public void AddToInitialDeck(string name)
        {
            CardTemplate card = editor.cards.First(c => c.name == name);
            editor.initialDeck.Add(card);
        }

        public void RemoveFromInitialDeck(string name)
        {
            CardTemplate card = editor.cards.First(c => c.name == name);
            editor.initialDeck.Remove(card);
        }

        public bool IsInitialCard(string name)
        {
            return editor.initialDeck.Any(c => c.name == name);
        }

        public object LoadWorldForEditing(int worldId)
        {
            var (world, dungeons) = SaveManager.LoadWorld(worldId);

            editor = DungeonEditor.loadFromWorld(world, dungeons);
            currentlyEditing = worldId;

            return new { World = world, Dungeons = dungeons };
        }

        public bool CreateDungeon(JsonElement json)
        {
            string name = json.GetProperty("name").GetString();
            string deckName = json.GetProperty("deckName").GetString();
            string type = json.GetProperty("type").GetString();
            bool hasBoss = json.GetProperty("hasBoss").GetBoolean();
            string reward = json.GetProperty("reward").GetString();

            Collection dungeonCollection = editor.collections.First(c => c.Name == deckName).collection;

            var dungeonType = type switch
            {
                "egyszeru" => DungeonTemplate.DungeonType.Small,
                "kis" => DungeonTemplate.DungeonType.Medium,
                "nagy" => DungeonTemplate.DungeonType.Big
            };

            DungeonTemplate.DungeonReward dungeonReward;

            if (reward == "kartya") dungeonReward = new DungeonTemplate.CardReward(dungeonCollection.Cards.ToArray());
            else dungeonReward = new DungeonTemplate.AttributeReward(Utils.GetAttributeByName(reward));

            DungeonTemplate template;


            if (hasBoss)
            {
                string boss = json.GetProperty("boss").GetString();
                CardTemplate bossCard = editor.cards.First(c => c.bossName == boss);
                template = new DungeonTemplate(dungeonType, name, dungeonCollection, bossCard, dungeonReward);
            }
            else
            {
                template = new DungeonTemplate(dungeonType, name, dungeonCollection, dungeonReward);
            }

            editor.dungeons.Add(template);

            return true;
        }

        public void SaveEditor(string name)
        {
            List<SaveManager.WorldSave.CollectionSave> collectionSaves = new();
            foreach (var collection in editor.collections)
            {
                string[] cards = new string[collection.collection.Size];
                for (int i = 0; i < collection.collection.Size; i++) cards[i] = collection.collection[i].name;
                collectionSaves.Add(new()
                {
                    collectionName = collection.Name,
                    cards = cards
                });
            }

            SaveManager.SaveWorld(currentlyEditing, editor.CompileMockEngine(), WebUtility.UrlDecode(name), collectionSaves);
        }

        public SaveManager.WorldSave GetDefaultWorld()
        {
            return SaveManager.GetWorlds()[0].world;
        }

        public List<SaveManager.WorldSave.PowerCardSave> GetPowerCards()
        {
            return editor.powerCards.Select(c => new SaveManager.WorldSave.PowerCardSave
            {
                name = c.getName(),
                value = c.getValue(),
                rarity = c.getRarity(),
                duration = c.getRarity(),
                type = c.GetType().Name
            }).ToList();
        }

        public List<DungeonData> GetDungeons()
        {
            return editor.dungeons.Select(d => new DungeonData
            {
                Name = d.name,
                HasBoss = d.bossTemplate != null,
                BossName = d.bossTemplate?.name,
                BossHealth = d.bossTemplate?.health ?? 0,
                BossDamage = d.bossTemplate?.damage ?? 0,
                Size = d.type switch
                {
                    DungeonTemplate.DungeonType.Small => "Egyszerű",
                    DungeonTemplate.DungeonType.Medium => "Kis",
                    DungeonTemplate.DungeonType.Big => "Nagy",
                },
                Reward = d.reward.GetType() == typeof(DungeonTemplate.AttributeReward) ? ((DungeonTemplate.AttributeReward)d.reward).Export() : "Kártya"
            }).ToList();
        }

        public List<DungeonPathTemplate> GetPaths()
        {
            return editor.dungeonPaths;
        }

        Dictionary<string, Func<int, int, string, int, PowerCard>> cardConstructors = new()
        {
            {"Heal", (duration, value, name, rarity) => new HealPower(duration, value, name, rarity)},
            {"Shield", (duration, value, name, rarity) => new ShieldPower(duration, value, name, rarity)},
            {"InstantDamage", (duration, value, name, rarity) => new DamagePower(duration, value, name, rarity)},
            {"DamageBuff", (duration, value, name, rarity) => new StrengthPower(duration, value, name, rarity)}
        };

        public bool CreateAbility(JsonElement e)
        {
            //{"name":"Here vakarás","type":"InstantDamage","value":67,"duration":0,"rarity":62,"description":""}
            string name = e.GetProperty("name").GetString();
            string type = e.GetProperty("type").GetString();
            int value = e.GetProperty("value").GetInt32();
            int duration = e.GetProperty("duration").GetInt32();
            int rarity = e.GetProperty("rarity").GetInt32();

            PowerCard card = cardConstructors[type](value, duration, name, rarity);
            editor.powerCards.Add(card);
            System.Console.WriteLine(editor.powerCards.Count);
            return true;
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

            var availableCards = new List<CardData>();
            int i = 0;
            foreach (var card in MauiProgram.engine.CardTemplates)
            {
                // System.Console.WriteLine($"{card.name};{MauiProgram.engine.PlayerInventory.Has(card)}");
                if (MauiProgram.engine.PlayerInventory.Has(card))
                {
                    var plyCard = MauiProgram.engine.PlayerInventory[card.Name];
                    availableCards.Add(new CardData
                    {
                        Index = i++,
                        Name = card.Name,
                        Attack = plyCard.damage,
                        Health = plyCard.Health,
                        ElementColor = card.ElementColor.ToHex() ?? "#1a1a2e",
                        IsOwned = true,
                        IsSelected = MauiProgram.deckBuilder.Any(d => d.name == card.name)
                    });
                }
                else
                {
                    availableCards.Add(new CardData
                    {
                        Index = i++,
                        Name = card.Name,
                        Attack = card.damage,
                        Health = card.Health,
                        ElementColor = card.ElementColor.ToHex() ?? "#1a1a2e",
                        IsOwned = false,
                        IsSelected = MauiProgram.deckBuilder.Any(d => d.name == card.name)
                    });
                }
            }


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
        public string Size { get; set; } = string.Empty;
        public string Reward { get; set; } = string.Empty;
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