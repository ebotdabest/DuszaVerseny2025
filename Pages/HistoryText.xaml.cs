using Microsoft.Maui.Controls;

namespace DuszaVerseny2025
{
    public partial class HistoryText : ContentView
    {
        public static readonly BindableProperty HistoryTextValueProperty =
            BindableProperty.Create(nameof(HistoryTextValue), typeof(string), typeof(HistoryText), "");

        public string HistoryTextValue
        {
            get => (string)GetValue(HistoryTextValueProperty);
            set => SetValue(HistoryTextValueProperty, value);
        }

        public HistoryText(string historyText)
        {
            InitializeComponent();
            BindingContext = this;
            HistoryTextValue = historyText;
        }

        public HistoryText() : this("")
        {
        }
    }
}