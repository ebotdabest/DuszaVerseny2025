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

    public static int CalculateDamage(int baseDamage, CardTemplate.Type attacker, CardTemplate.Type taker)
    {
        double multiplier = GetDamageMultiplier(attacker, taker);
        double adjusted = baseDamage * multiplier;
        if (multiplier == 0.5)
        {
            return (int)Math.Floor(adjusted);
        }
        return (int)adjusted;
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
}