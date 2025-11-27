// app/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, ArrowUp, Square, Plus, Search, X } from "lucide-react";
import { useForm } from "react-hook-form";

/* keep your config imports unchanged if you have them */
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config";

/* ---------- Minimal fallback components (if you already have your own replace these) ---------- */
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

/* ---------- keep your existing logic functions (simulateBotResponse, sampleRecommendations) ----------
   If you already have them defined elsewhere, keep using those. For this file I include the demo generator
   at the bottom (unchanged from earlier code you had). */

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<"idle" | "streaming" | "submitted">("idle");
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);

  // mood presets shown as chips (UI only)
  const MOOD_PRESETS = [
    "something funny and upbeat",
    "cozy and heartwarming",
    "fast-paced thrillers",
    "dark fantasy worlds",
    "short uplifting reads",
    "books like The Alchemist",
  ];

  // simple local welcome (same behavior as before)
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: `welcome`,
          role: "assistant",
          text: WELCOME_MESSAGE ?? `Hi — I'm ${AI_NAME ?? "LitLens"}. Tell me your reading taste and I'll recommend books.`,
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // react-hook-form for input
  const { register, handleSubmit, reset } = useForm<{ message: string }>({ defaultValues: { message: "" } });
  const inputRef = useRef<HTMLInputElement | null>(null);

  function addUserMessage(text: string) {
    const id = `u-${String(Math.abs(hashCode(text))).slice(0, 8)}`;
    const m: Message = { id, role: "user", text };
    setMessages((s) => [...s, m]);
    return m;
  }

  async function simulateBotResponse(userText: string) {
    // reuse your existing logic (UI-only update does not change this)
    setStatus("streaming");
    await new Promise((r) => setTimeout(r, 700));
    const botMsg: Message = {
      id: `b-${String(Math.abs(hashCode(userText))).slice(0, 8)}`,
      role: "assistant",
      text: `Got it — searching for books like: "${userText}". Here's a quick sample recommendation set.`,
    };
    setMessages((s) => [...s, botMsg]);
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
      setMessages([{ id: `welcome`, role: "assistant", text: WELCOME_MESSAGE ?? `Hi — I'm ${AI_NAME ?? "LitLens"}. Tell me your reading taste and I'll recommend books.` }]);
    }, 50);
  }

  // filter recommendations by genre (unchanged)
  const filteredRecommendations = useMemo(() => {
    if (selectedGenre === "All") return recommendations;
    return recommendations.filter((r) => r.genre === selectedGenre);
  }, [recommendations, selectedGenre]);

  /* UI render: mood-first search with cinematic horizontal results */
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#120612] via-[#170717] to-[#0c0810] text-white">
      {/* top bar */}
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

      {/* Main: mood + chat + results */}
      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_360px] gap-6">
        {/* Left: filters */}
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

        {/* Center: chat and mood UI */}
        <section className="flex flex-col gap-6">
          {/* Mood search (top of center column) */}
          <div className="rounded-xl p-6 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] border border-input/30 backdrop-blur-md">
            <h2 className="text-lg font-semibold mb-2">Search</h2>
            <p className="text-sm text-muted-foreground mb-4">Ask for vibes, themes, titles — whatever you're craving.</p>

            {/* preset chips */}
            <div className="flex flex-wrap gap-3 mb-4">
              {MOOD_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    addUserMessage(p);
                    simulateBotResponse(p);
                  }}
                  className="mood-chip"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* big pill input */}
            <div className="mt-2">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="glass-input flex items-center gap-3 px-4 py-3 rounded-full">
                  <input
                    {...register("message")}
                    ref={(r: any) => {
                      register("message").ref(r);
                      inputRef.current = r;
                    }}
                    placeholder="What are you in the mood to read?"
                    className="bg-transparent outline-none w-full text-sm placeholder-white/60"
                  />
                  <button type="submit" className="rounded-full p-2 bg-white/6">
                    <Search />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Chat (message wall) */}
          <div className="flex-1 overflow-auto min-h-[44vh] p-4 rounded-lg bg-card/60 border border-input">
            <MessageWall messages={messages} />
            {status === "streaming" && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="animate-spin" /> Generating recommendations…
              </div>
            )}
          </div>

          {/* For smaller screens: horizontal cinematic recommendations shown below chat */}
          {recommendations.length > 0 && (
            <div className="mt-2">
              <div className="text-sm text-muted-foreground mb-3">Recommended for you</div>
              <div className="horizontal-scroll -mx-4 px-4">
                <div className="flex gap-4">
                  {recommendations.map((book) => (
                    <div
                      key={book.id}
                      className="cinema-card min-w-[220px] rounded-xl overflow-hidden cursor-pointer"
                      onClick={() => setSelectedBook(book)}
                    >
                      <div className="relative w-full h-[300px]">
                        <Image src={book.cover} alt={book.title} fill style={{ objectFit: "cover" }} />
                      </div>
                      <div className="p-3 bg-gradient-to-t from-black/60 to-transparent">
                        <div className="font-semibold">{book.title}</div>
                        <div className="text-xs text-muted-foreground">{book.author} · ⭐ {book.rating}</div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{book.short}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right: compact recommendations & selected book preview */}
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

      {/* Floating bottom input (mobile-first) */}
      <div className="fixed left-0 right-0 bottom-6 flex justify-center pointer-events-none">
        <div className="w-full max-w-lg px-4 pointer-events-auto">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="glass-input flex items-center gap-3 px-4 py-3 rounded-full">
              <input
                {...register("message")}
                ref={(r: any) => {
                  register("message").ref(r);
                  inputRef.current = r;
                }}
                placeholder="Add to your search or start over"
                className="bg-transparent outline-none w-full text-sm placeholder-white/60"
              />
              <button type="submit" className="rounded-full p-2 bg-white/6">
                <ArrowUp />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---------- utility: simple stable hash for generating short ids ---------- */
function hashCode(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

  if (!query) return seed;

  const q = query.toLowerCase();
  // small deterministic re-order: sort by whether query contains certain keywords
  const score = (b: any) =>
    (q.includes("space") && b.title.toLowerCase().includes("project") ? 1.2 : 0) +
    (q.includes("thrill") && b.genre === "Mystery" ? 1.1 : 0) +
    (b.rating ?? 4) * 0.1;

  return seed
    .map((s) => ({ ...s, score: score(s) }))
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...rest }) => rest);
}
