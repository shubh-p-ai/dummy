// components/RecommendationCard.tsx
import React from "react";

type ParsedAltPick = {
  title?: string;
  reason?: string;
};

export type ParsedBook = {
  title: string;
  author?: string;
  shortReason?: string;
  formats?: string[];
  difficulty?: string;
  altPick?: ParsedAltPick;
};

export default function RecommendationCard({
  book,
  onShowSimilar,
}: {
  book: ParsedBook;
  onShowSimilar?: (title: string) => void;
}) {
  return (
    <div className="bg-card border rounded-2xl p-4 shadow-sm flex gap-4">
      <div className="w-24 h-32 bg-gradient-to-br from-slate-100 to-white rounded-lg flex items-center justify-center text-xs text-muted-foreground">
        Cover
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-base">{book.title}</div>
            {book.author ? <div className="text-sm text-muted-foreground">by {book.author}</div> : null}
          </div>
        </div>

        {book.shortReason ? (
          <div className="text-sm text-muted-foreground mt-3">{book.shortReason}</div>
        ) : null}

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {book.formats && book.formats.length ? book.formats.join(", ") : "Formats: N/A"} •{" "}
            <span className="font-medium">{book.difficulty || "Unknown"}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onShowSimilar?.(book.title)}
              className="text-sm px-3 py-1 rounded-full border hover:bg-muted-foreground/5"
            >
              Show similar
            </button>
          </div>
        </div>

        {book.altPick && (book.altPick.title || book.altPick.reason) ? (
          <div className="mt-3 p-3 bg-muted rounded-lg text-xs">
            <div className="font-medium">Alternative pick</div>
            <div className="mt-1">{book.altPick.title ? book.altPick.title + (book.altPick.reason ? ` — ${book.altPick.reason}` : "") : book.altPick.reason}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
