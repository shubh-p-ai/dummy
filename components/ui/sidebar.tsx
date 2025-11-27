// components/Sidebar.tsx
import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles } from "lucide-react";

type Props = {
  onNewChat: () => void;
  onPromptClick: (prompt: string) => void;
  quickPrompts?: string[];
  genres?: string[];
};

export default function Sidebar({
  onNewChat,
  onPromptClick,
  quickPrompts = [
    'Recommend short sci-fi novels',
    'Books like "Atomic Habits"',
    'Best historical fiction',
    'Quick reads under 300 pages'
  ],
  genres = ['Fiction', 'Science Fiction', 'Fantasy', 'Non-fiction', 'Romance', 'Mystery'],
}: Props) {
  return (
    <aside className="hidden md:flex md:w-80 lg:w-96 shrink-0 flex-col gap-6 h-screen sticky top-0 pt-6 pb-6 bg-surface/60 border-r">
      <div className="px-6">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 ring-1 ring-primary">
            <AvatarImage src="/logo.png" />
            <AvatarFallback>BR</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold">BookRecomm</h3>
            <p className="text-sm text-muted-foreground">Your Goodreads-powered book buddy</p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button onClick={onNewChat} variant="ghost" className="flex-1">
            New chat
          </Button>
        </div>
      </div>

      <div className="px-6">
        <h4 className="text-xs uppercase text-muted-foreground mb-2">Quick prompts</h4>
        <div className="flex flex-col gap-2">
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => onPromptClick(p)}
              className="text-sm text-left py-2 px-3 rounded-lg hover:bg-muted-foreground/5"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6">
        <h4 className="text-xs uppercase text-muted-foreground mb-2">Genres</h4>
        <div className="flex flex-wrap gap-2">
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => onPromptClick(`Recommend popular ${g} books`)}
              className="text-xs px-3 py-1 rounded-full border hover:bg-muted-foreground/5"
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto px-6">
        <div className="text-xs text-muted-foreground mb-2">Powered by</div>
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-indigo-500" />
          <div>
            <div className="text-sm font-medium">GoodDeeds</div>
            <div className="text-xs text-muted-foreground">Goodreads data & AI</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
