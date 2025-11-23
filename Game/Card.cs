using System;
using DuszaVerseny2025.Engine.Serializer;
using DuszaVerseny2025.Engine.Utils;

namespace DuszaVerseny2025.Engine.Cards
{
    public class CardTemplate : ISerialize
    {
        private readonly int _damage;
        private readonly int _health;
        private readonly string _name;
        private readonly Type _type;

        private string _bossName = string.Empty;
        private Card.Attribute _bossProficiency = Card.Attribute.None;

        public CardTemplate(int damage, int health, string name, Type type)
        {
            _damage = damage;
            _health = health;
            _name = name ?? throw new ArgumentNullException(nameof(name));
            _type = type;
        }

        public CardTemplate(int damage, int health, string name, Type type, string bossName, Card.Attribute bossProficiency)
            : this(damage, health, name, type)
        {
            _bossName = bossName ?? string.Empty;
            _bossProficiency = bossProficiency;
        }

        public enum Type
        {
            Fire,
            Water,
            Earth,
            Air,
            Useless
        }

        public int Attack => _damage;
        public int Health => _health;
        public string Name => _name;
        public Type ElementType => _type;

        // Legacy names, kept for compatibility
        public int damage => _damage;
        public int health => _health;
        public string name => _name;

        public string bossName => _bossName;
        public bool IsBoss => !string.IsNullOrEmpty(_bossName);
        public Card.Attribute bossProficiency => _bossProficiency;

        public Color ElementColor => _type switch
        {
            Type.Fire => Colors.IndianRed,
            Type.Water => Colors.DodgerBlue,
            Type.Air => Colors.LightBlue,
            Type.Earth => Colors.DarkOliveGreen,
            _ => Colors.Gray
        };

        public CardTemplate MakeAnother(int dmgDiff, int hpDiff)
        {
            return new CardTemplate(
                damage + dmgDiff,
                health + hpDiff,
                name,
                ElementType,
                bossName,
                bossProficiency
            );
        }

        public string Export()
        {
            var kind = IsBoss ? "vezer" : "kartya";

            var typeString = Utils.Utils.GetTypeName(ElementType);

            return $"{kind};{name};{damage};{health};{typeString}";
        }

        public static CardTemplate fromFile(string[] attributes)
        {
            if (attributes == null) throw new ArgumentNullException(nameof(attributes));
            if (attributes.Length < 4)
                throw new ArgumentException("Card attribute array must have at least 4 elements.", nameof(attributes));

            if (!int.TryParse(attributes[1], out var damage))
                throw new FormatException($"Invalid damage value '{attributes[1]}' in card file.");

            if (!int.TryParse(attributes[2], out var health))
                throw new FormatException($"Invalid health value '{attributes[2]}' in card file.");

            var type = attributes[3] switch
            {
                "tuz" => Type.Fire,
                "viz" => Type.Water,
                "levego" => Type.Air,
                "fold" => Type.Earth,
                _ => Type.Useless
            };

            return new CardTemplate(damage, health, attributes[0], type);
        }

        public CardTemplate ToBoss(string bossName, Card.Attribute prof)
        {
            if (string.IsNullOrWhiteSpace(bossName))
                throw new ArgumentException("Boss name cannot be null or whitespace.", nameof(bossName));

            int dmg = prof == Card.Attribute.Damage ? damage * 2 : damage;
            int hp = prof == Card.Attribute.Health ? health * 2 : health;

            return new CardTemplate(dmg, hp, this.name, ElementType, bossName, prof);
        }
    }

    public class Card
    {
        public enum Attribute
        {
            Damage,
            Health,
            None
        }

        private int _damage;
        private int _maxHealth;
        private int _health;
        private readonly string _name;
        private readonly CardTemplate _template;
        private readonly CardTemplate.Type _type;

        private Card(CardTemplate template)
        {
            if (template == null) throw new ArgumentNullException(nameof(template));

            _damage = template.damage;
            _health = template.health;
            _maxHealth = template.health;
            _name = template.name;
            _type = template.ElementType;
            _template = template;
        }

        protected Card(int damage, int health, int maxHealth, string name, CardTemplate.Type type, CardTemplate template)
        {
            _damage = damage;
            _health = health;
            _maxHealth = maxHealth;
            _name = name ?? throw new ArgumentNullException(nameof(name));
            _type = type;
            _template = template ?? throw new ArgumentNullException(nameof(template));
        }

        public static Card fromTemplate(CardTemplate template)
        {
            return new Card(template);
        }

        public string Name => _name;
        public int Health => _health;
        public int Damage => _damage;
        public CardTemplate.Type Type => _type;
        public CardTemplate Template => _template;

        public BossCard promote()
        {
            return new BossCard(this);
        }

        public void Attack(Card target, out int damageDealt)
        {
            if (target == null) throw new ArgumentNullException(nameof(target));

            if (this.Health <= 0 || target.Health <= 0)
            {
                damageDealt = 0;
                return;
            }

            int baseDamage = this.Damage;
            CardTemplate.Type attType = this.Type;
            CardTemplate.Type defType = target.Type;

            int effectiveDamage = Utils.Utils.CalculateDamage(baseDamage, attType, defType);
            damageDealt = effectiveDamage;

            target._health -= effectiveDamage;
            if (target._health < 0)
            {
                target._health = 0;
            }
        }
    }

    public class BossCard : Card
    {
        public BossCard(Card self)
            : base(
                self?.Damage ?? throw new ArgumentNullException(nameof(self)),
                self.Health,
                self.Health,
                self.Template.bossName,
                self.Type,
                self.Template)
        {
        }
    }
}
