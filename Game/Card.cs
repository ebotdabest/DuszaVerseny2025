namespace DuszaVerseny2025.Engine.Cards;

using DuszaVerseny2025.Engine.Serializer;
using DuszaVerseny2025.Engine.Utils;

public class CardTemplate : ISerialize
{
    int _damage;
    int _health;
    string _name;
    Type _type;


    public CardTemplate(int damage, int health, string name, Type type)
    {
        this._damage = damage;
        this._health = health;
        this._name = name;
        this._type = type;
    }

    public int Attack => _damage;
    public int Health => _health;
    public string Name => _name;
    public Type ElementType => _type;

    // Legacy naming for some reason they kept using theese
    public int damage => _damage;
    public int health => _health;
    public string name => _name;

    public Color ElementColor => _type switch
    {
        Type.Fire => Colors.IndianRed,
        Type.Water => Colors.DodgerBlue,
        Type.Air => Colors.LightBlue,
        Type.Earth => Colors.DarkOliveGreen,
        _ => Colors.Gray
    };

    public CardTemplate(int damage, int health, string name, CardTemplate.Type type, string bossName, Card.Attribute bossProficiency) : this(damage, health, name, type)
    {
        _bossName = bossName;
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
    string _bossName = "";
    Card.Attribute _bossProficiency = Card.Attribute.None;

    public string bossName => _bossName;
    public bool IsBoss => _bossName != "";
    public Card.Attribute bossProficiency => _bossProficiency;

    public CardTemplate MakeAnother(int dmgMult, int hpMult)
    {
        return new CardTemplate(damage + dmgMult, health + hpMult, name, ElementType, bossName, bossProficiency);
    }

    public string Export()
    {
        return $"{IsBoss switch
        {
            true => "vezer",
            false => "kartya"
        }};{name};{damage};{health};{ElementType switch
        {
            Type.Air => "levego",
            Type.Earth => "fold",
            Type.Fire => "tuz",
            Type.Water => "viz",
            _ => ""
        }}";
    }

    public static CardTemplate fromFile(string[] attributes)
    {
        return new CardTemplate(int.Parse(attributes[1]), int.Parse(attributes[2]), attributes[0], attributes[3] switch
        {
            "tuz" => Type.Fire,
            "viz" => Type.Water,
            "levego" => Type.Air,
            "fold" => Type.Earth,
            _ => Type.Useless
        });
    }

    public CardTemplate ToBoss(string name, Card.Attribute prof)
    {
        return new CardTemplate(prof == Card.Attribute.Damage ? damage * 2 : damage,
                                prof == Card.Attribute.Health ? health * 2 : health, name, ElementType, name, prof);
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

    int _damage;
    int _maxHealth;
    int _health;
    string _name;
    CardTemplate _template;

    CardTemplate.Type _type;

    Card(CardTemplate template)
    {
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
        _maxHealth = health;
        _name = name;
        _type = type;
        _template = template;
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
        if (this.Health <= 0 || target.Health <= 0)
        {
            damageDealt = 0;
            return;
        }

        int baseDamage = this.Damage;
        CardTemplate.Type attType = this.Type;
        CardTemplate.Type defType = target.Type;

        int effectiveDamage = Utils.CalculateDamage(baseDamage, attType, defType);
        damageDealt = effectiveDamage;

        target._health -= effectiveDamage;
        if (target.Health < 0) target._health = 0;
    }
}

public class BossCard : Card
{
    public BossCard(Card self) : base(self.Damage,
                                                        self.Health,
                                                        self.Health,
                                                        self.Template.bossName,
                                                        self.Type, self.Template)
    { }
}