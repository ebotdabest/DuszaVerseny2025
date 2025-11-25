using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using DuszaVerseny2025.Engine.Cards;
using Newtonsoft.Json;

namespace DuszaVerseny2025.Engine.Save
{
    public class SaveManager
    {
        private static readonly byte[] HEADER = Encoding.UTF8.GetBytes("TUFF");



        public class PlayerSave
        {
            public class PlayerCardOverride
            {
                public string cardName { get; set; } = default!;
                public int healthDiff { get; set; }
                public int damageDiff { get; set; }
            }

            public string[] unlockedCards { get; set; } = Array.Empty<string>();
            public string[] selectedCards { get; set; } = Array.Empty<string>();
            public PlayerCardOverride[] upgradedCards { get; set; } = Array.Empty<PlayerCardOverride>();
            public int saveBase { get; set; }
            public int difficulty { get; set; }
            public string saveName { get; set; } = string.Empty;
            public long saveTimestamp { get; set; }
            public required int saveId { get; set; }
        }

        public class WorldSave
        {
            public class CardSave
            {
                public int damage { get; set; }
                public int health { get; set; }
                public string name { get; set; } = string.Empty;
                public string type { get; set; } = string.Empty;
            }

            public class BossOverride
            {
                public string bossName { get; set; } = string.Empty;
                public string proficiency { get; set; } = string.Empty;
                public string originalName { get; set; } = string.Empty;
            }

            public class DungeonSave
            {
                public string dungeonName { get; set; } = string.Empty;
                public string[] cards { get; set; } = Array.Empty<string>();
                public string reward { get; set; } = string.Empty;
                public string bossName { get; set; } = string.Empty;
                public string dungeonSize { get; set; } = string.Empty;
            }

            public class CollectionSave
            {
                public string collectionName { get; set; } = String.Empty;
                public string[] cards { get; set; } = Array.Empty<string>();
            }

            public string templateName { get; set; } = string.Empty;
            public CardSave[] cards { get; set; } = Array.Empty<CardSave>();
            public BossOverride[] bosses { get; set; } = Array.Empty<BossOverride>();
            public CollectionSave[] collections { get; set; } = Array.Empty<CollectionSave>();
            public string[] starterDeck { get; set; } = Array.Empty<string>();
            public required int worldId { get; set; }
        }


        private static byte[] EncodeContent(string json)
        {
            var bytes = Encoding.UTF8.GetBytes(json);
            for (int i = 0; i < bytes.Length; i++)
            {
                bytes[i] ^= 0x5A;
            }
            return bytes;
        }

        private static string DecodeContent(byte[] bytes)
        {
            for (int i = 0; i < bytes.Length; i++)
            {
                bytes[i] ^= 0x5A;
            }
            return Encoding.UTF8.GetString(bytes);
        }

        private static void EnsureHeader(byte[] header, string path)
        {
            if (!header.SequenceEqual(HEADER))
                throw new InvalidOperationException($"File '{path}' does not have a valid TUFF header.");
        }


        public static PlayerSave LoadPlayerSave(int id)
        {
            string exeDir = AppContext.BaseDirectory;
            string savePath = Path.Combine(exeDir, "saves", $"damareen_world{id}.tuff");

            if (!File.Exists(savePath))
                throw new FileNotFoundException($"Player save file not found: {savePath}", savePath);

            using var file = new FileStream(savePath, FileMode.Open, FileAccess.Read, FileShare.Read);
            using var br = new BinaryReader(file);

            byte[] header = br.ReadBytes(4);
            EnsureHeader(header, savePath);

            byte[] content = br.ReadBytes((int)file.Length - 4);
            string contentStr = DecodeContent(content);

            var save = JsonConvert.DeserializeObject<PlayerSave>(contentStr)
                       ?? throw new InvalidOperationException($"Failed to deserialize PlayerSave from '{savePath}'.");

            return save;
        }

        public static void SavePlayerSave(int currentId, GameEngine engine, string saveName)
        {
            if (engine == null) throw new ArgumentNullException(nameof(engine));

            string exeDir = AppContext.BaseDirectory;
            string saveDir = Path.Combine(exeDir, "saves");
            if (!Directory.Exists(saveDir))
                Directory.CreateDirectory(saveDir);

            var templates = engine.PlayerInventory.Cards;
            string[] cardNames = templates.Select(c => c.Name).ToArray();

            string[] selectedCardNames = engine.currentDeck.Select(c => c.Name).ToArray();

            List<PlayerSave.PlayerCardOverride> overrides = new();

            foreach (CardTemplate t in engine.PlayerInventory.Cards)
            {
                CardTemplate? original = engine.CardTemplates.FirstOrDefault(c => c.Name == t.Name);
                if (original == null)
                {
                    Debug.WriteLine($"Warning: Inventory card '{t.Name}' not found in CardTemplates.");
                    continue;
                }

                if (original.Attack == t.Attack && original.Health == t.Health)
                    continue;

                int hpDiff = t.Health - original.Health;
                int dmgDiff = t.Attack - original.Attack;

                overrides.Add(new PlayerSave.PlayerCardOverride
                {
                    cardName = t.Name,
                    healthDiff = hpDiff,
                    damageDiff = dmgDiff
                });
            }

            long timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var save = new PlayerSave
            {
                unlockedCards = cardNames,
                selectedCards = selectedCardNames,
                upgradedCards = overrides.ToArray(),
                saveName = saveName ?? string.Empty,
                difficulty = engine.GameWorld.Difficulty,
                saveTimestamp = timestamp,
                saveBase = engine.GameWorld.BaseId,
                saveId = currentId
            };

            string content = JsonConvert.SerializeObject(save);
            byte[] encoded = EncodeContent(content);

            string savePath = Path.Combine(saveDir, $"damareen_world{currentId}.tuff");
            using var stream = new FileStream(savePath, FileMode.Create, FileAccess.Write, FileShare.None);
            using var bw = new BinaryWriter(stream);

            bw.Write(HEADER);
            bw.Write(encoded);
        }

        public static void SaveWorld(int id, GameEngine engine, string templateName)
        {
            SaveWorld(id, engine, templateName, new List<WorldSave.CollectionSave>());
        }


        public static void SaveWorld(int id, GameEngine engine, string templateName, List<WorldSave.CollectionSave> collections)
        {
            if (engine == null) throw new ArgumentNullException(nameof(engine));

            string worldBase = Path.Combine(AppContext.BaseDirectory, "worlds", $"w{id}");
            if (!Directory.Exists(worldBase)) Directory.CreateDirectory(worldBase);

            var cards = new List<WorldSave.CardSave>();
            var bosses = new List<WorldSave.BossOverride>();

            foreach (var card in engine.CardTemplates)
            {
                if (card.IsBoss)
                {
                    string proficiency = Utils.Utils.GetAttributeName(card.bossProficiency);

                    bosses.Add(new WorldSave.BossOverride
                    {
                        bossName = card.bossName,
                        proficiency = proficiency,
                        originalName = card.name
                    });
                }
                else
                {
                    string typeString = Utils.Utils.GetTypeName(card.ElementType);

                    cards.Add(new WorldSave.CardSave
                    {
                        name = card.name,
                        damage = card.damage,
                        health = card.health,
                        type = typeString
                    });
                }
            }



            string[] initialCards = engine.initialDeck.Select(c => c.name).ToArray();

            var worldSave = new WorldSave
            {
                templateName = templateName ?? string.Empty,
                cards = cards.ToArray(),
                bosses = bosses.ToArray(),
                starterDeck = initialCards,
                worldId = id,
                collections = collections.ToArray()
            };


            int dungeonId = 0;
            foreach (var dungeon in engine.GameWorld.Dungeons)
            {
                string[] dungeonCards = new string[dungeon.collection.Size];
                for (int i = 0; i < dungeon.collection.Size; i++)
                    dungeonCards[i] = dungeon.collection[i].name;

                string dungeonSize = dungeon.type switch
                {
                    DungeonTemplate.DungeonType.Small => "egyszeru",
                    DungeonTemplate.DungeonType.Medium => "kis",
                    DungeonTemplate.DungeonType.Big => "nagy",
                    _ => throw new InvalidOperationException(
                        $"Unsupported dungeon type '{dungeon.type}' for dungeon '{dungeon.name}'.")
                };

                string bossName = dungeon.bossTemplate != null ? dungeon.bossTemplate.bossName : string.Empty;
                string rewardStr = dungeon.reward.Export();


                string rewardTrimmed = rewardStr.Length > 0 ? rewardStr[1..] : string.Empty;

                var dungeonSave = new WorldSave.DungeonSave
                {
                    dungeonName = dungeon.name,
                    dungeonSize = dungeonSize,
                    bossName = bossName,
                    reward = rewardTrimmed,
                    cards = dungeonCards
                };

                string dungeonContent = JsonConvert.SerializeObject(dungeonSave);
                byte[] dungeonBytes = EncodeContent(dungeonContent);

                string dungeonPath = Path.Combine(worldBase, $"d{dungeonId++}.tuff");
                using var dfs = new FileStream(dungeonPath, FileMode.Create, FileAccess.Write, FileShare.None);
                using var dbw = new BinaryWriter(dfs);

                dbw.Write(HEADER);
                dbw.Write(dungeonBytes);
            }

            string worldContent = JsonConvert.SerializeObject(worldSave);
            byte[] worldBytes = EncodeContent(worldContent);

            string worldPath = Path.Combine(worldBase, "world.tuff");
            using (var fs = new FileStream(worldPath, FileMode.Create, FileAccess.Write, FileShare.None))
            using (var bw = new BinaryWriter(fs))
            {
                bw.Write(HEADER);
                bw.Write(worldBytes);
            }
        }

        public static (WorldSave, WorldSave.DungeonSave[]) LoadWorld(int id)
        {
            string worldDir = Path.Combine(AppContext.BaseDirectory, "worlds", $"w{id}");
            if (!Directory.Exists(worldDir))
                throw new DirectoryNotFoundException($"World directory not found: {worldDir}");

            string worldPath = Path.Combine(worldDir, "world.tuff");
            if (!File.Exists(worldPath))
                throw new FileNotFoundException($"World file not found: {worldPath}", worldPath);

            using (var fs = new FileStream(worldPath, FileMode.Open, FileAccess.Read, FileShare.Read))
            using (var br = new BinaryReader(fs))
            {
                byte[] header = br.ReadBytes(4);
                EnsureHeader(header, worldPath);

                byte[] contentBytes = br.ReadBytes((int)fs.Length - 4);
                string content = DecodeContent(contentBytes);

                var world = JsonConvert.DeserializeObject<WorldSave>(content)
                            ?? throw new InvalidOperationException($"Failed to deserialize WorldSave from '{worldPath}'.");

                var dungeonFiles = Directory.GetFiles(worldDir, "d*.tuff")
                                            .OrderBy(path =>
                                            {
                                                var name = Path.GetFileNameWithoutExtension(path);
                                                var indexStr = name.Substring(1);
                                                return int.TryParse(indexStr, out var idx) ? idx : int.MaxValue;
                                            })
                                            .ToArray();

                var dungeons = new List<WorldSave.DungeonSave>();

                foreach (var dFile in dungeonFiles)
                {
                    using var dfs = new FileStream(dFile, FileMode.Open, FileAccess.Read, FileShare.Read);
                    using var dbr = new BinaryReader(dfs);

                    byte[] dheader = dbr.ReadBytes(4);
                    if (!dheader.SequenceEqual(HEADER))
                    {
                        Debug.WriteLine($"Warning: Dungeon file '{dFile}' has invalid header, skipping.");
                        continue;
                    }

                    byte[] dcontentBytes = dbr.ReadBytes((int)dfs.Length - 4);
                    string dcontent = DecodeContent(dcontentBytes);

                    var dungeonSave = JsonConvert.DeserializeObject<WorldSave.DungeonSave>(dcontent);
                    if (dungeonSave == null)
                    {
                        Debug.WriteLine($"Warning: Failed to deserialize dungeon file '{dFile}', skipping.");
                        continue;
                    }

                    dungeons.Add(dungeonSave);
                }

                return (world, dungeons.ToArray());
            }
        }

        public static List<PlayerSave> GetSaves()
        {
            var playerSaves = new List<PlayerSave>();
            string saveDir = Path.Combine(AppContext.BaseDirectory, "saves");

            if (!Directory.Exists(saveDir))
                return playerSaves;

            foreach (var file in Directory.GetFiles(saveDir, "damareen_world*.tuff"))
            {
                var fileName = Path.GetFileNameWithoutExtension(file);
                var idStr = fileName.Replace("damareen_world", "");
                if (!int.TryParse(idStr, out var id))
                {
                    Debug.WriteLine($"Warning: Save file with unexpected name: {file}");
                    continue;
                }

                try
                {
                    playerSaves.Add(LoadPlayerSave(id));
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"Failed to load save '{file}': {ex}");
                }
            }

            return playerSaves;
        }

        public class WorldDungeonCombo
        {
            public WorldSave world { get; set; } = default!;
            public WorldSave.DungeonSave[] dungeons { get; set; } = Array.Empty<WorldSave.DungeonSave>();
        }

        public static WorldDungeonCombo[] GetWorlds()
        {
            string worldsDir = Path.Combine(AppContext.BaseDirectory, "worlds");
            if (!Directory.Exists(worldsDir))
                return Array.Empty<WorldDungeonCombo>();

            var combos = new List<WorldDungeonCombo>();

            foreach (var dir in Directory.GetDirectories(worldsDir, "w*"))
            {
                var dirName = Path.GetFileName(dir);
                var idStr = dirName.Substring(1);
                if (!int.TryParse(idStr, out var id))
                {
                    Debug.WriteLine($"Warning: World directory with unexpected name: {dir}");
                    continue;
                }

                try
                {
                    var (world, dungeons) = LoadWorld(id);
                    combos.Add(new WorldDungeonCombo
                    {
                        world = world,
                        dungeons = dungeons
                    });
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"Failed to load world '{dir}': {ex}");
                }
            }

            return combos.ToArray();
        }
    }
}
