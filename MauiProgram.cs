using DuszaVerseny2025.Engine;
using DuszaVerseny2025.Engine.Cards;
using DuszaVerseny2025.Engine.Utils;
using Microsoft.Extensions.Logging;

using Microsoft.Maui;
using Microsoft.Maui.Handlers;
using Microsoft.Maui.Hosting;
using System;
using System.IO;
using System.Linq;
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
			templates.Add(temp.ToBoss(args[0], args[2] switch
			{
				"sebzes" => Card.Attribute.Damage,
				"eletero" => Card.Attribute.Health,
				_ => Card.Attribute.None
			}));
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
		// Lowk össze kell rakni a fullos motort csak ide, mert ez nem data amit passzívan lehet kezelni

		StringBuilder builder = new StringBuilder();
		GameEngine engine = new GameEngine(cards, dungeons, playerInventory);
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

			if (ev.event_name == "round_over")
			{
				builder.AppendLine();
			}
		});
		if (didWin)
		{
			Console.WriteLine(lastCard);
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
			Console.WriteLine(dungeons.Count);
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
	[DllImport("kernel32.dll", SetLastError = true)]
	static extern bool AllocConsole();

	[DllImport("kernel32.dll", SetLastError = true)]
	static extern bool FreeConsole();
	public static List<CardTemplate> deckBuilder = new List<CardTemplate>();

	static CardTemplate findTemplate(List<CardTemplate> templates, string name)
	{
		return templates.Where(t => t.name.ToLower() == name.ToLower()).First();
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
		templates.Add(torak.ToBoss("Lord Torak", Card.Attribute.Health));
		return templates;
	}

	static void SetupEngine()
	{
		var dungeons = new List<DungeonTemplate>();

		var templates = CreateCards();

		var smallCollection = new Collection(new List<CardTemplate> { findTemplate(templates, "selia") });
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
			"Osi Szentely", mediumCollection, findTemplate(templates, "lord torak"), mediumReward);
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

		engine = new GameEngine(templates, dungeons, inventory);
	}

	public static MauiApp CreateMauiApp()
	{
		string[] args = Environment.GetCommandLineArgs();
		// AllocConsole();
		if (args.Length < 2) Environment.Exit(1);
		if (args[1] != "--ui")
		{
			TestMode tm = new TestMode();
			try
			{
				tm.DoTest(args[1]);
			}
			catch (Exception e)
			{
				Console.WriteLine(e.StackTrace);
			}
			// FreeConsole();
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
		builder.Logging.AddDebug();
#endif

		builder.Services.AddSingleton<MainPage>();
		builder.Services.AddTransient<GamePage>();

		return builder.Build();
	}
}
