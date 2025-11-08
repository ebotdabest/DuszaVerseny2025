using System.Globalization;
using DuszaVerseny2025.Engine.Cards;

namespace DuszaVerseny2025.Converters
{
    public class CardTemplateToAvailabilityConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is CardTemplate card && MainPage.Current?.engine?.PlayerInventory?.Has(card) == true)
                return 1.0;
            return 0.5;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
            => throw new NotImplementedException();
    }
}