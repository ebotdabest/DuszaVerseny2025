using DuszaVerseny2025.ViewModels;

namespace DuszaVerseny2025.Pages
{
    public partial class CardView : ContentView
    {
        public CardView()
        {
            InitializeComponent();
        }

        private async void OnCardTapped(object sender, TappedEventArgs e)
        {
            if (BindingContext is not CardViewModel vm) return;

            MessagingCenter.Send(this, "CardTapped", vm);

            if (sender is VisualElement elem)
            {
                await elem.ScaleTo(1.12, 120);
                await elem.ScaleTo(1.0, 80);
            }
        }
    }
}