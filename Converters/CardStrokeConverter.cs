using System.Globalization;
using Microsoft.Maui.Graphics;
using DuszaVerseny2025.Engine.Cards;
using DuszaVerseny2025.ViewModels;

namespace DuszaVerseny2025.Converters
{
    public class CardStrokeConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is not CardViewModel vm) return Color.FromArgb("#16213e");
            var engine = MauiProgram.engine;
            if (engine == null) return Color.FromArgb("#16213e");

            bool isOwned = engine.PlayerInventory.Has(vm.Template);
            bool isSelected = vm.IsSelected;

            if (isSelected) return Colors.Orange;
            if (isOwned) return Color.FromArgb("#16213e");
            return Colors.Gray;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
            => throw new NotImplementedException();
    }
}