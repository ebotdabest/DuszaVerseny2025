using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using DuszaVerseny2025.ViewModels;
using System.Collections.Generic;
using Microsoft.Maui.Controls;

namespace DuszaVerseny2025;

public class GameBoardViewModel : INotifyPropertyChanged, IQueryAttributable
{
        private List<CardViewModel> _selectedCards = new();
        public List<CardViewModel> SelectedCards
        {
                get => _selectedCards;
                set
                {
                        if (_selectedCards != value)
                        {
                                _selectedCards = value ?? new List<CardViewModel>();
                                OnPropertyChanged();
                        }
                }
        }

        public event PropertyChangedEventHandler? PropertyChanged;
        private void OnPropertyChanged([CallerMemberName] string? name = null) =>
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));

        private string topLabelText;
        private string enemyName;
        private string enemyHealth;
        private string enemyDamage;
        private string currentName;
        private string currentHealth;
        private string currentDamage;
        private bool showEnemy;
        private bool showCurrent;

        private bool showStartButton = true;

        public bool ShowStart
        {
                get => showStartButton;
                set { if (showStartButton != value) { showStartButton = value; OnPropertyChanged(); } }
        }


        public string TopLabelText
        {
                get => topLabelText;
                set { if (topLabelText != value) { topLabelText = value; OnPropertyChanged(); } }
        }

        public string EnemyName
        {
                get => enemyName;
                set { if (enemyName != value) { enemyName = value; OnPropertyChanged(); } }
        }
        public string EnemyHealth
        {
                get => enemyHealth;
                set { if (enemyHealth != value) { enemyHealth = value; OnPropertyChanged(); } }
        }

        public string EnemyDamage
        {
                get => enemyDamage;
                set { if (enemyDamage != value) { enemyDamage = value; OnPropertyChanged(); } }
        }

        public bool ShowEnemy
        {
                get => showEnemy;
                set { if (showEnemy != value) { showEnemy = value; OnPropertyChanged(); } }
        }

        public string CurrentName
        {
                get => currentName;
                set { if (currentName != value) { currentName = value; OnPropertyChanged(); } }
        }
        public string CurrentHealth
        {
                get => currentHealth;
                set { if (currentHealth != value) { currentHealth = value; OnPropertyChanged(); } }
        }
        public string CurrentDamage
        {
                get => currentDamage;
                set { if (currentDamage != value) { currentDamage = value; OnPropertyChanged(); } }
        }
        public bool ShowCurrent
        {
                get => showCurrent;
                set { if (showCurrent != value) { showCurrent = value; OnPropertyChanged(); } }
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

        public GameBoardViewModel(List<CardViewModel>? selectedCards = null)
        {
                SelectedCards = selectedCards ?? new List<CardViewModel>();
        }

        public void ApplyQueryAttributes(IDictionary<string, object> query)
        {
                if (query.TryGetValue("SelectedCards", out var cardsObj) &&
                    cardsObj is List<CardViewModel> cards)
                {
                        SelectedCards = cards;
                }
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