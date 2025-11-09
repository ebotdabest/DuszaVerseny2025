using System.Globalization;
using Microsoft.Maui.Graphics;

namespace DuszaVerseny2025.Converters
{
    public class CardNameToStrokeConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is string name && MauiProgram.engine?.PlayerInventory?.Has(name) == true)
                return Color.FromArgb("#16213e");
            return Colors.Gray;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
            => throw new NotImplementedException();
    }
}