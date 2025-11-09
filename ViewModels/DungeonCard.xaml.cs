using Microsoft.Maui.Controls;
using Microsoft.Maui.Platform;

namespace DuszaVerseny2025.Views
{
    public partial class DungeonCard : ContentView
    {
        public static readonly BindableProperty TitleProperty =
            BindableProperty.Create(nameof(Title), typeof(string), typeof(DungeonCard), string.Empty);

        public static readonly BindableProperty BossNameProperty =
            BindableProperty.Create(nameof(BossName), typeof(string), typeof(DungeonCard), string.Empty);

        public static readonly BindableProperty BossHealthProperty =
            BindableProperty.Create(nameof(BossHealth), typeof(string), typeof(DungeonCard), string.Empty);
        public static readonly BindableProperty BossDamageProperty =
            BindableProperty.Create(nameof(BossDamage), typeof(string), typeof(DungeonCard), string.Empty);
        public static readonly BindableProperty ShowCardProperty =
            BindableProperty.Create(nameof(ShowCard), typeof(bool), typeof(DungeonCard), false);

        public static readonly BindableProperty ClickProperty =
            BindableProperty.Create(nameof(Command), typeof(Command), typeof(DungeonCard));

        public string Title
        {
            get => (string)GetValue(TitleProperty);
            set => SetValue(TitleProperty, value);
        }

        public string BossName
        {
            get => (string)GetValue(BossNameProperty);
            set => SetValue(BossNameProperty, value);
        }

        public string BossHealth
        {
            get => (string)GetValue(BossHealthProperty);
            set => SetValue(BossHealthProperty, value);
        }
        public string BossDamage
        {
            get => (string)GetValue(BossDamageProperty);
            set => SetValue(BossDamageProperty, value);
        }
        public bool ShowCard
        {
            get => (bool)GetValue(ShowCardProperty);
            set => SetValue(ShowCardProperty, value);
        }

        public Command OnClick
        {
            get => (Command)GetValue(ClickProperty);
            set => SetValue(ClickProperty, value);
        }

        public DungeonCard()
        {
            InitializeComponent();
        }

        private void OnDungeonButtonClicked(object sender, EventArgs e)
        {
            OnClick?.Execute(null);
        }

        private void HandleHoverSoItLooksNice(object sender, EventArgs e)
        {
            var mauiButton = (Button)sender;
            Color original = mauiButton.BackgroundColor;
            var nativeButton = mauiButton.ToPlatform(mauiButton.Handler.MauiContext);
            if (nativeButton == null) return;

            nativeButton.PointerEntered += (s, args) =>
            {
                mauiButton.BackgroundColor = Colors.DarkCyan;
            };

            nativeButton.PointerExited += (s, args) =>
            {
                mauiButton.BackgroundColor = original;
            };
        }
    }
}
