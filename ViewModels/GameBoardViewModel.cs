using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using DuszaVerseny2025.ViewModels;
using System.Collections.Generic;

namespace DuszaVerseny2025;

public class GameBoardViewModel : INotifyPropertyChanged
{
        public List<CardViewModel> SelectedCards { get; }

        public event PropertyChangedEventHandler? PropertyChanged;
        private void OnPropertyChanged([CallerMemberName] string? name = null) =>
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));

        private string topLabelText = "Osi Szenteleky";
        public string TopLabelText
        {
                get => topLabelText;
                set { if (topLabelText != value) { topLabelText = value; OnPropertyChanged(); } }
        }

        private string player1Text = "Player";
        public string Player1Text
        {
                get => player1Text;
                set { if (player1Text != value) { player1Text = value; OnPropertyChanged(); } }
        }

        private string player2Text = "Kazamata";
        public string Player2Text
        {
                get => player2Text;
                set { if (player2Text != value) { player2Text = value; OnPropertyChanged(); } }
        }

        private string kazamataText = "Kazamata";
        public string KazamataText
        {
                get => kazamataText;
                set { if (kazamataText != value) { kazamataText = value; OnPropertyChanged(); } }
        }

        private string roundText = "1. kor";
        public string RoundText
        {
                get => roundText;
                set { if (roundText != value) { roundText = value; OnPropertyChanged(); } }
        }

        private ObservableCollection<CardItem> cards = new();
        public ObservableCollection<CardItem> Cards
        {
                get => cards;
                set { if (cards != value) { cards = value; OnPropertyChanged(); } }
        }

        private ObservableCollection<HistoryItem> historyItems = new();
        public ObservableCollection<HistoryItem> HistoryItems
        {
                get => historyItems;
                set { if (historyItems != value) { historyItems = value; OnPropertyChanged(); } }
        }

        public GameBoardViewModel(List<CardViewModel> selectedCards)
        {
            SelectedCards = selectedCards ?? new List<CardViewModel>();
        }
        public void LoadInitialData()
        {
            Cards.Clear();
            HistoryItems.Clear();

            Cards.Add(new CardItem { CardText = "Kazamata for Kirese" });
            Cards.Add(new CardItem { CardText = "Osszes Okiw an ele 4" });

            HistoryItems.Add(new HistoryItem { HistoryText = "1. Kor: Jatekos at ossz Oki wan" });
            HistoryItems.Add(new HistoryItem { HistoryText = "Kira sebbez: 2, Oki wan ele: 4" });
            HistoryItems.Add(new HistoryItem { HistoryText = "1. Kor Vege" });
            HistoryItems.Add(new HistoryItem { HistoryText = "Nyeremeny: Obiwan -1 szezes" });

            RoundText = "3. kor";
        }

        public void AddCard(string text) => Cards.Add(new CardItem { CardText = text });

        public void UpdateRound(int roundNumber) => RoundText = $"{roundNumber}. kor";

        public void AddHistoryEntry(string entry) => HistoryItems.Add(new HistoryItem { HistoryText = entry });
        }

public class CardItem : INotifyPropertyChanged
{
        public event PropertyChangedEventHandler? PropertyChanged;
        private void OnPropertyChanged([CallerMemberName] string? name = null) =>
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));

        private string cardText = string.Empty;
        public string CardText
        {
                get => cardText;
                set { if (cardText != value) { cardText = value; OnPropertyChanged(); } }
        }
}

public class HistoryItem : INotifyPropertyChanged
{
        public event PropertyChangedEventHandler? PropertyChanged;
        private void OnPropertyChanged([CallerMemberName] string? name = null) =>
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));

        private string historyText = string.Empty;
        public string HistoryText
        {
                get => historyText;
                set { if (historyText != value) { historyText = value; OnPropertyChanged(); } }
        }
}