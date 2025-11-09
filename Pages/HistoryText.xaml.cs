using Microsoft.Maui.Controls;

namespace DuszaVerseny2025
{
        public partial class HistoryText : ContentPage
        {
                public static readonly BindableProperty HistoryProperty =
                BindableProperty.Create(nameof(HistoryTextContent), typeof(string), typeof(HistoryText), "");
                public string HistoryTextContent { get => (string)GetValue(HistoryProperty); set => SetValue(HistoryProperty, value); }

                public HistoryText(string historyText)
                {
                        InitializeComponent();
                        BindingContext = this;
                        HistoryTextContent = historyText;
                }
        }
}
