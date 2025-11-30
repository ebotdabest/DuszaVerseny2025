using DuszaVerseny2025.Engine;
using DuszaVerseny2025.Engine.Cards;
using DuszaVerseny2025.Engine.Save;
using DuszaVerseny2025.Engine.Utils;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System.Runtime.InteropServices;
using System.Text;

namespace DuszaVerseny2025;

class TestMode
{
    void New(string diff, string[] args, List<CardTemplate> templates, List<DungeonTemplate> dungeons,
    ref PlayerCollection? inventory, ref Deck playerDeck)
    {
        if (diff == "kartya")
        {
            var temp = CardTemplate.fromFile(args);
            templates.Add(temp);
        }
        else if (diff == "vezer")
        {
            var found_templates = templates.Where(t => t.name == args[1]).ToList();
            if (found_templates.Count == 0) { return; }
            var temp = found_templates[0];
            templates.Add(temp.ToBoss(args[0], Utils.GetAttributeByName(args[2])));
        }
        else if (diff == "kazamata")
        {
            var temp = DungeonTemplate.fromFile(args, templates);
            if (temp != null)
                dungeons.Add(temp);
        }
        else if (diff == "jatekos")
        {
            inventory = new PlayerCollection();
        }
        else if (diff == "pakli")
        {
            List<CardTemplate> deckCards = new List<CardTemplate>();
            foreach (var card in args[0].Split(","))
            {
                deckCards.Add(templates.Where(t => t.name == card).First());
            }
            if (inventory == null) return;
            Deck deck;
            if (Deck.fromCollection(inventory, deckCards, out deck))
                playerDeck = deck;
        }
    }

    void Add(string diff, string[] args, PlayerCollection playerInventory, List<CardTemplate> templates)
    {
        if (diff == "gyujtemenybe")
        {
            var card = templates.Where(t => t.name == args[0]).First();
            playerInventory.AddToCollection(card);
        }
    }

    void Fight(string[] args, List<DungeonTemplate> dungeons, List<CardTemplate> cards, PlayerCollection playerInventory, Deck currentDeck, string path)
    {
        StringBuilder builder = new StringBuilder();
        GameEngine engine = new GameEngine(cards, dungeons, playerInventory, 1);
        Dungeon dungeon = engine.GameWorld.generateDungeon(engine.GameWorld.Dungeons.Where(d => d.name == args[0]).First());

        builder.AppendLine($"harc kezdodik;{dungeon.Name}");
        builder.AppendLine();

        string lastCard = "";
        bool didWin = engine.GameWorld.FightDungeon(dungeon, currentDeck, ref lastCard, (ev) =>
        {
            int round = (int)ev.values["round"];
            if (ev.event_name == "game:select")
            {
                Card card = (Card)ev.values["card"];

                builder.AppendLine($"{round}.kor;kazamata;kijatszik;{card.Name};{card.Damage};{card.Health};{Utils.GetTypeName(card.Type)}");
            }
            if (ev.event_name == "player:select")
            {
                Card card = (Card)ev.values["card"];

                builder.AppendLine($"{round}.kor;jatekos;kijatszik;{card.Name};{card.Damage};{card.Health};{Utils.GetTypeName(card.Type)}");
            }
            if (ev.event_name == "game:attack")
            {
                Card enemy = (Card)ev.values["enemy"];
                Card player = (Card)ev.values["card"];
                int damage = (int)ev.values["damage"];

                builder.AppendLine($"{round}.kor;kazamata;tamad;{enemy.Name};{damage};{player.Name};{player.Health}");
            }

            if (ev.event_name == "player:attack")
            {
                Card card = (Card)ev.values["card"];
                Card enemy = (Card)ev.values["enemy"];
                int damage = (int)ev.values["damage"];
                builder.AppendLine($"{round}.kor;jatekos;tamad;{card.Name};{damage};{enemy.Name};{enemy.Health}");
            }


            if (ev.event_name == "result")
            {
                string result = (string)ev.values["result"];
                builder.AppendLine(result);
            }

            if (ev.event_name == "round")
            {
                builder.AppendLine();
            }
        });
        if (didWin)
        {
            dungeon.Reward.Grant(playerInventory,
            playerInventory.Cards.Where(c => c.name == lastCard).First());
        }

        File.WriteAllText(Path.Combine(path, args[1]), builder.ToString());
    }

    void Export(string diff, string[] args, PlayerCollection playerInventory, Deck playerDeck, string path, List<CardTemplate> cards,
    List<DungeonTemplate> dungeons)
    {
        if (diff == "jatekos")
        {
            StringBuilder builder = new StringBuilder();
            builder.Append(playerInventory.Export());
            if (playerDeck != null)
            {
                builder.AppendLine();
                builder.Append(playerDeck.Export());
            }
            File.WriteAllText(Path.Combine(path, args[0]), builder.ToString());
        }
        else if (diff == "vilag")
        {
            StringBuilder builder = new StringBuilder();
            StringBuilder bosses = new StringBuilder();
            foreach (var card in cards)
            {
                if (card.IsBoss)
                {
                    bosses.AppendLine(card.Export());
                    continue;
                }

                builder.AppendLine(card.Export());
            }
            StringBuilder dungeonBuilder = new StringBuilder();
            foreach (var dungeon in dungeons)
            {
                dungeonBuilder.AppendLine(dungeon.Export());
            }
            builder.AppendLine();
            builder.AppendLine(bosses.ToString());
            builder.Append(dungeonBuilder.ToString());
            File.WriteAllText(Path.Combine(path, args[0]), builder.ToString());
        }
    }

    void Execute(string command, string[] args, List<CardTemplate> templates, List<DungeonTemplate> dungeons,
    ref PlayerCollection? playerInventory, ref Deck playerDeck, string path)
    {
        string[] cmd_args = command.Split(" ");
        string type = cmd_args[0];
        string diff = "";
        if (cmd_args.Length > 1) diff = cmd_args[1];
        switch (type)
        {
            case "uj":
                New(diff, args, templates, dungeons, ref playerInventory, ref playerDeck);
                break;

            case "felvetel":
                if (playerInventory == null) break;

                Add(diff, args, playerInventory, templates);
                break;

            case "harc":
                Fight(args, dungeons, templates, playerInventory, playerDeck, path);
                break;

            case "export":
                Export(diff, args, playerInventory, playerDeck, path, templates, dungeons);
                break;
        }
    }

    public void DoTest(string path)
    {
        List<CardTemplate> templates = new List<CardTemplate>();
        List<DungeonTemplate> dungeons = new List<DungeonTemplate>();
        string[] lines = File.ReadAllLines(Path.Combine(path, "in.txt"));
        PlayerCollection? playerInventory = null;
        Deck? playerDeck = null;
        foreach (string line in lines)
        {
            string[] args = line.Split(";");
            Execute(args[0], args.Skip(1).ToArray(), templates, dungeons, ref playerInventory, ref playerDeck, path);
        }
        if (playerInventory == null) return;
        if (playerDeck == null) return;
    }
}

public static class MauiProgram
{
    public static DeckBuilder deckBuilder = new DeckBuilder();

    static CardTemplate findTemplate(List<CardTemplate> templates, string name)
    {
        var lowered = name.ToLower();
        return templates.First(t =>
            t.Name.ToLower() == lowered ||
            t.bossName.ToLower() == lowered);
    }

    public static GameEngine engine;

    static List<CardTemplate> CreateCards()
    {
        List<CardTemplate> templates = new List<CardTemplate>();
        var torak = new CardTemplate(3, 4, "Torak", CardTemplate.Type.Earth);
        var selia = new CardTemplate(2, 6, "Selia", CardTemplate.Type.Water);
        templates.Add(new CardTemplate(2, 6, "Arin", CardTemplate.Type.Earth));
        templates.Add(new CardTemplate(2, 4, "Liora", CardTemplate.Type.Air));
        templates.Add(new CardTemplate(3, 3, "Nerum", CardTemplate.Type.Fire));
        templates.Add(selia);
        templates.Add(torak);
        templates.Add(new CardTemplate(2, 5, "Emera", CardTemplate.Type.Air));
        templates.Add(new CardTemplate(2, 7, "Vorn", CardTemplate.Type.Water));
        templates.Add(new CardTemplate(3, 5, "Kael", CardTemplate.Type.Fire));
        templates.Add(new CardTemplate(2, 6, "Myra", CardTemplate.Type.Earth));
        templates.Add(new CardTemplate(3, 5, "Thalen", CardTemplate.Type.Air));
        templates.Add(new CardTemplate(2, 6, "Isara", CardTemplate.Type.Water));
        templates.Add(selia.ToBoss("Priestess Selia", Card.Attribute.Health));
        templates.Add(torak.ToBoss("Lord Torak", Card.Attribute.Damage));
        return templates;
    }

    static void SetupEngine()
    {
        var dungeons = new List<DungeonTemplate>();

        var templates = CreateCards();

        var smallCollection = new Collection(new List<CardTemplate> { findTemplate(templates, "nerum") });
        var smallReward = new DungeonTemplate.AttributeReward(Card.Attribute.Health);
        var smallDungeon = new DungeonTemplate(DungeonTemplate.DungeonType.Small, "Barlangi Portya", smallCollection, smallReward);
        dungeons.Add(smallDungeon);

        var mediumCollection = new Collection(new List<CardTemplate> {
                findTemplate(templates, "arin"),
                findTemplate(templates, "torak"),
                findTemplate(templates, "isara")
            });

        var mediumReward = new DungeonTemplate.AttributeReward(Card.Attribute.Damage);
        var mediumDungeon = new DungeonTemplate(
            DungeonTemplate.DungeonType.Medium,
            "Ősi Szentély", mediumCollection, findTemplate(templates, "lord torak"), mediumReward);
        dungeons.Add(mediumDungeon);

        var bigCollection = new Collection(new List<CardTemplate> {
                findTemplate(templates, "arin"),
                findTemplate(templates, "torak"),
                findTemplate(templates, "isara"),
                findTemplate(templates, "thalen"),
                findTemplate(templates, "emera")
            });
        var bigReward = new DungeonTemplate.CardReward(bigCollection.Cards.ToArray());
        var bigDungeon = new DungeonTemplate(DungeonTemplate.DungeonType.Big, "A mélység királynője", bigCollection, findTemplate(templates, "priestess selia"), bigReward);
        dungeons.Add(bigDungeon);

        var inventory = new PlayerCollection();
        inventory.AddToCollection(findTemplate(templates, "arin"));
        inventory.AddToCollection(findTemplate(templates, "liora"));

        engine = new GameEngine(templates, dungeons, inventory, 0);
        deckBuilder.engine = engine;

        // Populate power cards
        engine.powerCards.Add(new HealPower(0, 5, "Kis Gyógyital", 1));
        engine.powerCards.Add(new ShieldPower(2, 0, "Pajzs", 1));
        engine.powerCards.Add(new DamagePower(0, 5, "Tűzgolyó", 1));
        engine.powerCards.Add(new StrengthPower(2, 2, "Erő Ital", 1));
    }

    public static int currentSaveId;
    public static string currentSaveName;

    [DllImport("kernel32.dll")] static extern bool AllocConsole();
    [DllImport("kernel32.dll")] static extern bool FreeConsole();
    [DllImport("kernel32.dll")]
    static extern bool SetErrorMode(uint uMode);

    const uint SEM_FAILCRITICALERRORS = 1;
    const uint SEM_NOGPFAULTERRORBOX = 2;


    // static async Task callbackTest(World.FightEvent ev)
    // {
    //     System.Console.WriteLine(ev.event_name);
    // }

    public static MauiApp CreateMauiApp()
    {
        string[] args = Environment.GetCommandLineArgs();
        AllocConsole();

        if (args.Length < 2) Environment.Exit(1);
        if (args[1] == "peek")
        {
            System.Console.WriteLine($"Loading save: {int.Parse(args[2])}");
            var save = SaveManager.LoadPlayerSave(int.Parse(args[2]));
            System.Console.WriteLine(JsonConvert.SerializeObject(save));
            Console.ReadLine();
            Environment.Exit(0);
        }

        if (args[1] == "wpeek")
        {
            System.Console.WriteLine($"Loading world: {int.Parse(args[2])}");
            var save = SaveManager.LoadWorld(int.Parse(args[2]));
            System.Console.WriteLine(JsonConvert.SerializeObject(save));
            Console.ReadLine();
            Environment.Exit(0);
        }
        if (args[1] != "--ui")
        {
            // TestMode tm = new TestMode();
            // tm.DoTest(args[1]);

            // var cards = new List<CardTemplate>
            // {
            //     new CardTemplate(2,2,"sanyi", CardTemplate.Type.Air),
            //     new CardTemplate(4,4,"fos", CardTemplate.Type.Earth)
            // };

            // var dungeon = new DungeonTemplate(DungeonTemplate.DungeonType.Small, "Smegma Castle",
            // new Collection(cards), new DungeonTemplate.AttributeReward(Card.Attribute.Damage));
            // PlayerCollection pc = new PlayerCollection();
            // pc.AddToCollection(cards[0]);
            // GameEngine e = new GameEngine(cards, new() { dungeon }, pc, 3);
            // e.GameWorld.SetBaseId(1);
            // SaveManager.SaveWorld(1, e, "Smegma world");
            // SaveManager.SavePlayerSave(0, e, "My awesome save!");

            // SetupEngine();
            // DungeonPathTemplate pathTemplate = new DungeonPathTemplate("Way of the testicle", engine.GameWorld.Dungeons.ToArray());
            // var c = new Collection(new()
            // {
            //     engine.CardTemplates[0],
            //     engine.CardTemplates[1]
            // });
            // Deck d = Deck.makeGameDeck(c);
            // DungeonPath path = new DungeonPath(pathTemplate, d, callbackTest);
            // path.FightPath(engine).Wait();

            // SaveManager.SaveWorld(1, engine, "Back up");

            SetupEngine();
            SaveManager.SaveWorld(0, engine, "Az alap világ");
            DungeonTemplate[] dungeons = new DungeonTemplate[] { engine.GameWorld.Dungeons[0], engine.GameWorld.Dungeons[1] };
            engine.dungeonPaths = new()
            {
                new DungeonPathTemplate("Út 2", dungeons, engine.CardTemplates.ToArray(), new int[] {1,2} )
            };

            SaveManager.SaveWorld(1, engine, "Back up");

            Console.ReadLine();
            FreeConsole();
            Environment.Exit(0);
        }
        SetupEngine();

        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
                .ConfigureFonts(fonts =>
                {
                    fonts.AddFont("RetroByte.ttf", "RetroByte");
                });

#if DEBUG
        builder.Services.AddHybridWebViewDeveloperTools();
        builder.Logging.AddDebug();
#endif

        builder.Services.AddSingleton<MainPage>();
        builder.Services.AddTransient<GamePage>();

#if WINDOWS
        Microsoft.Maui.Handlers.WindowHandler.Mapper.AppendToMapping("Fullscreen", (handler, view) =>
        {
            var mauiWindow = handler.VirtualView;
            var nativeWindow = handler.PlatformView;

            nativeWindow.AppWindow.Changed += (s, e) =>
            {
                if (nativeWindow.AppWindow.Presenter is Microsoft.UI.Windowing.OverlappedPresenter p)
                {
                    // p.SetBorderAndTitleBar(false, false);
                    // p.Maximize();
                }
            };
        });
#endif
        return builder.Build();
    }
}