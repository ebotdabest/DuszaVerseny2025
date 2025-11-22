using System.Text;
using Microsoft.Win32.SafeHandles;
using Newtonsoft.Json;
using System.Linq;
using DuszaVerseny2025.Engine.Cards;

namespace DuszaVerseny2025.Engine.Save;

public class SaveManager
{
    static byte[] HEADER = Encoding.UTF8.GetBytes(['T', 'U', 'F', 'F']);
    public class PlayerSave
    {
        public class PlayerCardOverride
        {
            public string cardName { get; set; } = default!;
            public int healthDiff { get; set; }
            public int damageDiff { get; set; }
        }
        public string[] unlockedCards { get; set; } = default!;
        public string[] selectedCards { get; set; } = default!;
        public PlayerCardOverride[] upgradedCards { get; set; } = default!;
        public int saveBase { get; set; }
        public int difficulty { get; set; }
        public string saveName { get; set; } = default!;
        public long saveTimestamp { get; set; }
    }


    public class WorldSave
    {
        public class CardSave
        {
            public int damage { get; set; }
            public int health { get; set; }
            public string name { get; set; } = default!;
            public string type { get; set; } = default!;
        }

        public class BossOverride
        {
            public string bossName { get; set; } = default!;
            public string proficiency { get; set; } = default!;
            public int cardIndex { get; set; }
        }

        public string templateName { get; set; } = default!;
        public CardSave[] cards { get; set; } = default!;
        public BossOverride[] bosses { get; set; } = default!;
        public string[] starterDeck { get; set; } = default!;
    }

    public static PlayerSave LoadPlayerSave(int id)
    {
        string exeDir = AppContext.BaseDirectory;
        string savePath = Path.Combine(exeDir, "saves", $"damareen_world{id}.tuff");

        using (FileStream file = new FileStream(savePath, FileMode.Open))
        using (BinaryReader br = new BinaryReader(file))
        {
            byte[] header = br.ReadBytes(4);
            if (!header.SequenceEqual(HEADER))
            {
                throw new Exception("This isn't a proper save file!");
            }

            byte[] content = br.ReadBytes(((int)file.Length) - 4);
            for (int i = 0; i < content.Length; i++)
                content[i] ^= 0x5A;

            string contentStr = Encoding.UTF8.GetString(content);
            System.Console.WriteLine(contentStr);
            PlayerSave save = JsonConvert.DeserializeObject<PlayerSave>(contentStr);
            return save;
        }
    }

    public static void SavePlayerSave(int currentId, GameEngine engine, string saveName)
    {
        string exeDir = AppContext.BaseDirectory;
        if (!Directory.Exists(Path.Combine(exeDir, "saves")))
            Directory.CreateDirectory(Path.Combine(exeDir, "saves"));

        var templates = engine.PlayerInventory.Cards;
        string[] cardNames = new string[templates.Count];

        int j = 0; Array.ForEach(templates.ToArray(), c => cardNames[j++] = c.Name);

        string[] selectedCardNames = new string[engine.currentDeck.Count];
        j = 0; engine.currentDeck.ForEach(c => selectedCardNames[j++] = c.Name);

        List<PlayerSave.PlayerCardOverride> overrides = new(); // I'm too lazy to type all ts out

        foreach (CardTemplate t in engine.PlayerInventory.Cards)
        {
            CardTemplate original = engine.CardTemplates.FirstOrDefault(c => c.Name == t.Name);

            if (original.Attack == t.Attack && original.Health == t.Health) continue;

            int hpDiff = t.Health - original.Health, dmgDiff = t.Attack - original.Attack;
            overrides.Add(new PlayerSave.PlayerCardOverride()
            {
                cardName = t.Name,
                healthDiff = hpDiff,
                damageDiff = dmgDiff
            });
        }

        long timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        PlayerSave save = new PlayerSave
        {
            unlockedCards = cardNames,
            selectedCards = selectedCardNames,
            upgradedCards = overrides.ToArray(),
            saveName = saveName,
            difficulty = engine.GameWorld.Difficulty,
            saveTimestamp = timestamp,
            saveBase = engine.GameWorld.BaseId
        };

        string content = JsonConvert.SerializeObject(save);
        byte[] bytes = Encoding.UTF8.GetBytes(content);
        byte[] idk = Encoding.UTF8.GetBytes("TUFF");
        for (int i = 0; i < bytes.Length; i++)
        {
            bytes[i] ^= 0x5A;
        }

        using (FileStream stream = new FileStream(Path.Combine(exeDir, "saves", "damareen_world" + currentId.ToString() + ".tuff"), FileMode.Create))
        using (BinaryWriter bw = new BinaryWriter(stream))
        {
            bw.Write(idk);
            bw.Write(bytes);
        }
    }

    public static void SaveWorld(int id, GameEngine engine, string templateName)
    {
        string worldBase = Path.Combine(AppContext.BaseDirectory, "worlds", $"w{id}");
        if (!Directory.Exists(worldBase))
            Directory.CreateDirectory(worldBase);

        WorldSave.CardSave[] cards = new WorldSave.CardSave[engine.CardTemplates.Count];
        List<WorldSave.BossOverride> bosses = new();

        for (int i = 0; i < engine.CardTemplates.Count; i++)
        {
            CardTemplate gameCard = engine.CardTemplates[i];
            if (!gameCard.IsBoss)
            {
                WorldSave.CardSave card = new WorldSave.CardSave
                {
                    name = gameCard.name,
                    damage = gameCard.damage,
                    health = gameCard.health,
                    type = gameCard.Export().Split(";").Last(),

                };
                cards[i] = card;
            }
            else
            {
                WorldSave.BossOverride boss = new WorldSave.BossOverride()
                {
                    bossName = gameCard.bossName,
                    proficiency = gameCard.bossProficiency switch
                    {
                        Card.Attribute.Damage => "sebzes",
                        Card.Attribute.Health => "eletero",
                        _ => "idk"
                    },
                    cardIndex = i
                };
                bosses.Add(boss);
            }
        }

        string[] initialCards = new string[engine.initialDeck.Count];
        for (int i = 0; i < engine.initialDeck.Count; i++)
        {
            initialCards[i] = engine.initialDeck[i].name;
        }

        WorldSave save = new WorldSave
        {
            templateName = templateName,
            cards = cards,
            bosses = bosses.ToArray(),
            starterDeck = initialCards
        };

        string content = JsonConvert.SerializeObject(save);
        byte[] contentBytes = Encoding.UTF8.GetBytes(content);
        for (int i = 0; i < contentBytes.Length; i++) contentBytes[i] ^= 0x5A;

        using (FileStream fs = new FileStream(Path.Combine(worldBase, "world.tuff"), FileMode.Create))
        using (BinaryWriter bw = new BinaryWriter(fs))
        {
            bw.Write(Encoding.UTF8.GetBytes("TUFF"));
            bw.Write(contentBytes);
        }
    }
    public static WorldSave LoadWorld(int id)
    {
        using (FileStream fs = new FileStream(Path.Combine(AppContext.BaseDirectory, "worlds", $"w{id}", "world.tuff"), FileMode.Open))
        using (BinaryReader br = new BinaryReader(fs))
        {
            byte[] header = br.ReadBytes(4);
            if (!header.SequenceEqual(HEADER))
            {
                // throw new Exception("This isn't a proper tuff file!");
                System.Console.WriteLine("Meh");
            }

            byte[] contentBytes = br.ReadBytes(((int)fs.Length) - 4);
            for (int i = 0; i < contentBytes.Length; i++)
                contentBytes[i] ^= 0x5A;

            string content = Encoding.UTF8.GetString(contentBytes);
            System.Console.WriteLine(content);

            return JsonConvert.DeserializeObject<WorldSave>(content);
        }
    }

    public static List<PlayerSave> GetSaves()
    {
        List<PlayerSave> playerSaves = new List<PlayerSave>();
        var saves = Path.Combine(AppContext.BaseDirectory, "saves");
        for (int i = 0; i < Directory.GetFiles(saves).Length; i++)
        {
            playerSaves.Add(LoadPlayerSave(i));
        }
        return playerSaves;
    }
}