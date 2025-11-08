using DuszaVerseny2025.Engine;
using DuszaVerseny2025.Engine.Cards;

using Microsoft.Extensions.Logging;

using Microsoft.Maui;
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

			Console.WriteLine(temp);
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
            if(Deck.fromCollection(inventory, deckCards, out deck))
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

	void Fight(string[] args)
	{

	}
	
	void Export(string diff, string[] args, PlayerCollection playerInventory, Deck playerDeck)
    {
        if (diff == "jatekos")
        {
			StringBuilder builder = new StringBuilder();
			builder.Append(playerInventory.Export());
			
        }
    }

	void Execute(string command, string[] args, List<CardTemplate> templates, List<DungeonTemplate> dungeons,
	ref PlayerCollection? playerInventory, ref Deck playerDeck)
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
				Fight(args);
				break;

			case "export":
				Export(diff, args, playerInventory, playerDeck);
				break;
		}
	}
	GameEngine engine;

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
			Execute(args[0], args.Skip(1).ToArray(), templates, dungeons, ref playerInventory, ref playerDeck);
		}
		foreach (var t in templates)
		{
			Console.WriteLine($"Boss name ({t.name}): {t.bossName}");
		}

		if (playerInventory == null) return;
		if (playerDeck == null) return;
		
		foreach (var c in playerInventory.Cards)
        {
			Console.WriteLine(c);
        }
		foreach (var c in playerDeck.Cards)
		{
			Console.WriteLine(c.Name);
        }
		
		engine = new GameEngine(templates, dungeons, playerInventory);
    }
}

public static class MauiProgram
{
	[DllImport("kernel32.dll", SetLastError = true)]
	static extern bool AllocConsole();

	[DllImport("kernel32.dll", SetLastError = true)]
	static extern bool FreeConsole();

	public static MauiApp CreateMauiApp()
	{
		string[] args = Environment.GetCommandLineArgs();		
		AllocConsole();
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
			finally
            {
				Console.ReadLine();
            }
			FreeConsole();
			Environment.Exit(0);
        }
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
