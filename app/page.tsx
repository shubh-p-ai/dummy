// app/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

/* If your project provides these components (used in your repo), import them:
   - MessageWall
   - ChatHeader / ChatHeaderBlock
   - Button, Input, Avatar
   Otherwise minimal fallbacks are provided below so this file renders. */
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config";
import { Loader2, ArrowUp, Square, Plus } from "lucide-react";
import { useForm } from "react-hook-form";

/* ---------- Minimal fallback components (if you already have your own replace these imports) ---------- */
const Button = (p: any) => <button {...p} />;
const Input = (p: any) => <input {...p} />;
const Avatar = (p: any) => <div {...p} />;
const MessageWall = ({ messages }: { messages: any[] }) => (
  <div className="space-y-4">
    {messages.map((m: any) => (
      <div key={m.id} className={`p-3 rounded-lg ${m.role === "assistant" ? "bg-card" : "bg-muted"}`}>
        <div className="text-sm whitespace-pre-wrap">{m.text}</div>
      </div>
    ))}
  </div>
);

type Message = { id: string; role: "user" | "assistant"; text: string };

/* ---------- Page ---------- */
export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<"idle" | "streaming" | "submitted">("idle");
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);

  // simple local welcome
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          role: "assistant",
          text: WELCOME_MESSAGE ?? `Hi — I'm ${AI_NAME ?? "LitLens"}. Tell me your reading taste and I'll recommend books.`,
        },
      ]);
    }
  }, []);

  // react-hook-form for input
  const { register, handleSubmit, reset } = useForm<{ message: string }>({ defaultValues: { message: "" } });
  const inputRef = useRef<HTMLInputElement | null>(null);

  function addUserMessage(text: string) {
    const m: Message = { id: `u-${Date.now()}`, role: "user", text };
    setMessages((s) => [...s, m]);
    return m;
  }

  async function simulateBotResponse(userText: string) {
    setStatus("streaming");
    // a placeholder: in your real app you'd call your /api/chat route
    await new Promise((r) => setTimeout(r, 700));
    const botMsg: Message = {
      id: `b-${Date.now()}`,
      role: "assistant",
      text: `Got it — searching for books like: "${userText}". Here's a quick sample recommendation set.`,
    };
    setMessages((s) => [...s, botMsg]);
    // produce demo recommendations
    setRecommendations(sampleRecommendations(userText));
    setStatus("idle");
  }

  function onSubmit(data: { message: string }) {
    const trimmed = data.message.trim();
    if (!trimmed) return;
    addUserMessage(trimmed);
    reset();
    simulateBotResponse(trimmed);
    inputRef.current?.focus();
  }

  function clearChat() {
    setMessages([]);
    setRecommendations([]);
    setSelectedBook(null);
    setTimeout(() => {
      setMessages([{ id: `welcome-${Date.now()}`, role: "assistant", text: WELCOME_MESSAGE }]);
    }, 50);
  }

  // filter recommendations by genre
  const filteredRecommendations = useMemo(() => {
    if (selectedGenre === "All") return recommendations;
    return recommendations.filter((r) => r.genre === selectedGenre);
  }, [recommendations, selectedGenre]);

  return (
    <div className="min-h-screen">
      {/* Top header */}
      <header className="w-full border-b border-input bg-card/60 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">L</Avatar>
            <div>
              <div className="text-sm font-medium">LitLens</div>
              <div className="text-xs text-muted-foreground">AI book recommendations — powered by your reading taste</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Button onClick={clearChat} className="px-3 py-1 rounded-md border border-input text-sm">
              <Plus className="inline-block mr-2" /> New Chat
            </Button>
            <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} {OWNER_NAME}</div>
          </div>
        </div>
      </header>

      {/* Main 3-column layout */}
      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_380px] gap-6">
        {/* Left column: filters / user */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <div className="p-4 rounded-lg bg-card/60 border border-input">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-12 h-12 rounded-md">U</Avatar>
                <div>
                  <div className="text-sm font-medium">Your profile</div>
                  <div className="text-xs text-muted-foreground">Reader preferences</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mb-2">Quick filters</div>
              <div className="flex flex-col gap-2">
                <select
                  className="w-full rounded-md border border-input p-2 bg-transparent"
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                >
                  <option>All</option>
                  <option>Fiction</option>
                  <option>Mystery</option>
                  <option>Sci-Fi</option>
                  <option>Nonfiction</option>
                  <option>Fantasy</option>
                </select>
                <button
                  className="w-full rounded-md px-3 py-2 border border-input text-sm"
                  onClick={() => {
                    // quick prompt to suggest recommendations based on filters
                    const genrePrompt = selectedGenre === "All" ? "recommend me some books" : `recommend me ${selectedGenre} books`;
                    addUserMessage(`Find books: ${genrePrompt}`);
                    simulateBotResponse(genrePrompt);
                  }}
                >
                  Suggest books
                </button>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-card/60 border border-input">
              <div className="text-sm font-medium mb-1">Reading history</div>
              <div className="text-xs text-muted-foreground">(local demo only)</div>
              <div className="mt-3 grid gap-2">
                {messages
                  .filter((m) => m.role === "user")
                  .slice(-4)
                  .reverse()
                  .map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        addUserMessage(`Revisit: ${m.text}`);
                        simulateBotResponse(m.text);
                      }}
                      className="text-left text-sm rounded-md px-2 py-1 hover:bg-muted"
                    >
                      {m.text.slice(0, 36)}{m.text.length > 36 ? "…" : ""}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Center column: chat */}
        <section className="flex flex-col gap-4">
          <div className="flex-1 overflow-auto min-h-[60vh] p-4 rounded-lg bg-card/60 border border-input">
            <MessageWall messages={messages} />
            {status === "streaming" && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="animate-spin" /> Generating recommendations…
              </div>
            )}
          </div>

          {/* Input bar */}
          <form onSubmit={handleSubmit(onSubmit)} className="sticky bottom-4 bg-transparent">
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              <div className="flex-1">
                <Input
                  {...register("message")}
                  ref={(r: any) => {
                    register("message").ref(r);
                    inputRef.current = r;
                  }}
                  placeholder="Tell me what you like — authors, books, mood, or just 'surprise me'..."
                  className="w-full rounded-2xl border border-input p-3 bg-card/30"
                  onKeyDown={(e: any) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(onSubmit)();
                    }
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  className="rounded-full w-12 h-12 flex items-center justify-center border border-input"
                >
                  <ArrowUp />
                </Button>
                {status === "streaming" && (
                  <Button
                    onClick={() => setStatus("idle")}
                    className="rounded-full w-12 h-12 flex items-center justify-center border border-input"
                  >
                    <Square />
                  </Button>
                )}
              </div>
            </div>
          </form>
        </section>

        {/* Right column: recommendations */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <div className="p-4 rounded-lg bg-card/60 border border-input">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-medium">Recommendations</div>
                  <div className="text-xs text-muted-foreground">Based on your chat</div>
                </div>
                <div className="text-xs text-muted-foreground">{filteredRecommendations.length} items</div>
              </div>

              <div className="mt-3 space-y-3 max-h-[60vh] overflow-auto pr-2">
                {filteredRecommendations.length === 0 && (
                  <div className="text-xs text-muted-foreground">No recommendations yet — ask LitLens for suggestions.</div>
                )}

                {filteredRecommendations.map((book) => (
                  <article
                    key={book.id}
                    className="p-2 rounded-md border border-input flex gap-3 hover:shadow-sm hover:scale-[1.01] transition-all"
                    onClick={() => setSelectedBook(book)}
                  >
                    <div className="w-14 flex-shrink-0">
                      <Image src={book.cover} width={92} height={128} alt={book.title} className="rounded-sm object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold leading-tight">{book.title}</div>
                      <div className="text-xs text-muted-foreground">{book.author}</div>
                      <div className="text-xs mt-2 line-clamp-2 text-muted-foreground">{book.short}</div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="text-xs text-muted-foreground">⭐ {book.rating} · {book.genre}</div>
                        <div className="flex gap-2">
                          <a className="text-xs underline" href={book.goodreads} target="_blank" rel="noreferrer">Goodreads</a>
                          <button
                            className="text-xs px-2 py-0.5 rounded border border-input"
                            onClick={(e) => {
                              e.stopPropagation();
                              // save action: for now just set selected
                              setSelectedBook(book);
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* selected book preview */}
            <div className="p-4 rounded-lg bg-card/60 border border-input">
              <div className="text-sm font-medium mb-2">Selected book</div>
              {!selectedBook ? (
                <div className="text-xs text-muted-foreground">Click a recommendation to see details</div>
              ) : (
                <div className="flex gap-3">
                  <div className="w-20 flex-shrink-0">
                    <Image src={selectedBook.cover} width={120} height={170} alt={selectedBook.title} className="rounded" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{selectedBook.title}</div>
                    <div className="text-xs text-muted-foreground">{selectedBook.author}</div>
                    <div className="mt-2 text-xs line-clamp-4 text-muted-foreground">{selectedBook.long}</div>
                    <div className="mt-3 flex gap-2">
                      <a href={selectedBook.goodreads} target="_blank" rel="noreferrer" className="text-sm underline">Open on Goodreads</a>
                      <button className="px-3 py-1 border border-input rounded-md text-sm" onClick={() => alert("Saved (demo)")}>Save</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

/* ---------- demo recommendation generator (replace with real backend results) ---------- */
function sampleRecommendations(query: string) {
  const seed = [
    {
      id: "b1",
      title: "The Night Watchman",
      author: "Louise Erdrich",
      rating: 4.1,
      short: "A moving novel about family and resilience.",
      long: "An absorbing novel about a Native American community... (demo blurb).",
      cover: "/demo/covers/night-watchman.jpg",
      genre: "Fiction",
      goodreads: "https://www.goodreads.com/",
    },
    {
      id: "b2",
      title: "Project Hail Mary",
      author: "Andy Weir",
      rating: 4.5,
      short: "A thrilling solo space mission with science at heart.",
      long: "A near-future solo astronaut wakes with no memory and must save humanity... (demo blurb).",
      cover: "/demo/covers/project-hail-mary.jpg",
      genre: "Sci-Fi",
      goodreads: "https://www.goodreads.com/",
    },
    {
      id: "b3",
      title: "The Silent Patient",
      author: "Alex Michaelides",
      rating: 4.0,
      short: "A gripping psychological thriller with a twist.",
      long: "A psychotherapist tries to treat a silent patient who shot her husband... (demo blurb).",
      cover: "/demo/covers/silent-patient.jpg",
      genre: "Mystery",
      goodreads: "https://www.goodreads.com/",
    },
  ];

  // return seeded list plus some query-driven re-order
  if (!query) return seed;
  const q = query.toLowerCase();
  return seed
    .map((s, i) => ({
      ...s,
      rating: Math.round((s.rating + (q.includes("space") ? 0.4 : 0) - (i * 0.05)) * 10) / 10,
    }))
    .sort((a, b) => b.rating - a.rating);
}
