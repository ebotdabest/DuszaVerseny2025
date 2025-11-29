using DuszaVerseny2025.Engine.Cards;

namespace DuszaVerseny2025.Engine.Utils;

public class Utils
{
    public static bool DoesDamageMultiply(CardTemplate.Type attacker, CardTemplate.Type taker)
    {
        if (attacker == CardTemplate.Type.Air)
        {
            return taker == CardTemplate.Type.Water || taker == CardTemplate.Type.Earth;
        }
        else if (attacker == CardTemplate.Type.Water)
        {
            return taker == CardTemplate.Type.Air || taker == CardTemplate.Type.Fire;
        }
        else if (attacker == CardTemplate.Type.Fire)
        {
            return taker == CardTemplate.Type.Earth || taker == CardTemplate.Type.Water;
        }
        else if (attacker == CardTemplate.Type.Earth)
        {
            return taker == CardTemplate.Type.Air || taker == CardTemplate.Type.Fire;
        }
        return false;
    }

    public static bool IsDamageHalved(CardTemplate.Type attacker, CardTemplate.Type taker)
    {
        if (attacker == CardTemplate.Type.Air)
        {
            return taker == CardTemplate.Type.Fire;
        }
        else if (attacker == CardTemplate.Type.Water)
        {
            return taker == CardTemplate.Type.Earth;
        }
        else if (attacker == CardTemplate.Type.Fire)
        {
            return taker == CardTemplate.Type.Air;
        }
        else if (attacker == CardTemplate.Type.Earth)
        {
            return taker == CardTemplate.Type.Water;
        }
        return false;
    }

    public static double GetDamageMultiplier(CardTemplate.Type attacker, CardTemplate.Type taker)
    {
        if (attacker == taker)
        {
            return 1.0;
        }
        if (DoesDamageMultiply(attacker, taker))
        {
            return 2.0;
        }
        if (IsDamageHalved(attacker, taker))
        {
            return 0.5;
        }
        return 1.0;
    }

    private static readonly Random Rng = new Random();

    public static double CalculateDamageDifficulty(int baseDamage, int difficulty, bool isPlayer)
    {
        if (difficulty <= 0)
            return baseDamage;

        var rnd = Rng.NextDouble();
        if (isPlayer)
        {
            return Math.Round(baseDamage * (1 - rnd * difficulty / 20));
        }
        return Math.Round(baseDamage * (1 + rnd * difficulty / 10));
    }

    public static int CalculateDamage(int baseDamage, CardTemplate.Type attacker, CardTemplate.Type taker, int difficulty, bool isPlayer)
    {
        double multiplier = GetDamageMultiplier(attacker, taker);
        double adjusted = baseDamage * multiplier;
        if (multiplier == 0.5)
        {
            adjusted = Math.Floor(adjusted);
        }

        double finalDamage = CalculateDamageDifficulty((int)adjusted, difficulty, isPlayer);

        return (int)finalDamage;
    }

    public static string GetTypeName(CardTemplate.Type type)
    {
        return type switch
        {
            CardTemplate.Type.Air => "levego",
            CardTemplate.Type.Earth => "fold",
            CardTemplate.Type.Water => "viz",
            CardTemplate.Type.Fire => "tuz",
            _ => ""
        };
    }

    public static CardTemplate.Type GetNamedType(string type)
    {
        return type switch
        {
            "levego" => CardTemplate.Type.Air,
            "fold" => CardTemplate.Type.Earth,
            "viz" => CardTemplate.Type.Water,
            "tuz" => CardTemplate.Type.Fire
        };
    }

    public static Card.Attribute GetAttributeByName(string attribute)
    {
        return attribute switch
        {
            "sebzes" => Card.Attribute.Damage,
            "eletero" => Card.Attribute.Health,
            _ => Card.Attribute.None
        };
    }
    public static string GetAttributeName(Card.Attribute attribute)
    {
        return attribute switch
        {
            Card.Attribute.Damage => "sebzes",
            Card.Attribute.Health => "eletero",
            _ => ""
        };
    }

    public static PowerCard GetRandomCard(List<PowerCard> cards)
    {
        int GetWeight(PowerCard card)
        {
            int r = card.getRarity();

            if (r < 5) return 1;
            if (r < 20) return 5;
            if (r < 100) return 20;
            return 50;
        }

        int totalWeight = cards.Sum(GetWeight);

        int roll = Rng.Next(totalWeight);

        foreach (var card in cards)
        {
            int w = GetWeight(card);
            if (roll < w)
                return card;
            roll -= w;
        }

        return cards[0];
    }
}