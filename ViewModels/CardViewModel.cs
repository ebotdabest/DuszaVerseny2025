using DuszaVerseny2025.Engine.Cards;
using System.ComponentModel;

namespace DuszaVerseny2025.ViewModels
{
    public class CardViewModel : INotifyPropertyChanged
    {
        public CardTemplate Template { get; }

        private bool _isSelected;
        private int _order;

        private bool _isInteractable;
        public bool IsInteractable
        {
            get => _isInteractable;
            set
            {
                if (_isInteractable == value) return;
                _isInteractable = value;
                OnPropertyChanged(nameof(IsInteractable));
            }
        }

        private int _originalIndex = -1;
        public int OriginalIndex
        {
            get => _originalIndex;
            set
            {
                if (_originalIndex == value) return;
                _originalIndex = value;
                OnPropertyChanged(nameof(OriginalIndex));
            }
        }

        public bool IsSelected
        {
            get => _isSelected;
            set
            {
                _isSelected = value;
                OnPropertyChanged(nameof(IsSelected));
            }
        }

        public int Order
        {
            get => _order;
            set
            {
                _order = value;
                OnPropertyChanged(nameof(Order));
            }
        }

        public CardViewModel(CardTemplate template)
        {
            Template = template;
        }

        public event PropertyChangedEventHandler PropertyChanged;
        protected void OnPropertyChanged(string propertyName)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}