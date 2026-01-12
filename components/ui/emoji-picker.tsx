'use client';

import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

const EMOJI_CATEGORIES = [
  {
    name: 'Événements',
    emojis: ['💍', '💒', '👰', '🤵', '💐', '🎂', '🎉', '🎊', '🎈', '🎁', '🥂', '🍾', '✨', '🌟', '⭐', '💫'],
  },
  {
    name: 'Cœurs & Amour',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '😍'],
  },
  {
    name: 'Nature & Fleurs',
    emojis: ['🌸', '🌺', '🌷', '🌹', '🥀', '🌻', '🌼', '💮', '🏵️', '🌿', '🍀', '🌳', '🌴', '🍃', '🍂', '🌾'],
  },
  {
    name: 'Décoration',
    emojis: ['🕯️', '🪔', '💡', '🔮', '🪞', '🖼️', '🎨', '🎭', '🎪', '🏰', '⛪', '🏛️', '🌈', '☀️', '🌙', '💎'],
  },
  {
    name: 'Nourriture & Boissons',
    emojis: ['🍰', '🧁', '🎂', '🍫', '🍬', '🍭', '🍩', '🍪', '☕', '🍵', '🥤', '🧃', '🍷', '🍸', '🥂', '🍾'],
  },
  {
    name: 'Symboles',
    emojis: ['✨', '💫', '⭐', '🌟', '✴️', '🔆', '💠', '🔷', '🔶', '▪️', '▫️', '◾', '◽', '🔲', '🔳', '⬛'],
  },
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = 120;
      tabsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-14 text-3xl hover:bg-secondary"
        >
          {value || '✨'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {/* Category tabs with arrows */}
        <div className="flex items-center border-b border-border">
          <button
            onClick={() => scrollTabs('left')}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div
            ref={tabsRef}
            className="flex overflow-x-auto p-1 gap-1 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {EMOJI_CATEGORIES.map((category, index) => (
              <button
                key={category.name}
                onClick={() => setActiveCategory(index)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  activeCategory === index
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => scrollTabs('right')}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Emoji grid */}
        <div className="p-3">
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className={`w-8 h-8 flex items-center justify-center text-xl rounded hover:bg-secondary transition-colors ${
                  value === emoji ? 'bg-primary/20 ring-2 ring-primary' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Current selection */}
        <div className="border-t border-border p-2 flex items-center justify-between bg-secondary/30">
          <span className="text-xs text-muted-foreground">Sélectionné :</span>
          <span className="text-2xl">{value || '✨'}</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
