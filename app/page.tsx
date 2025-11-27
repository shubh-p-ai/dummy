"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Eraser, Loader2, Plus, PlusIcon, Square } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader } from "@/app/parts/chat-header";
import { ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config";
import Image from "next/image";
import Link from "next/link";

const formSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters."),
});

const STORAGE_KEY = 'chat-messages';

type StorageData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

const loadMessagesFromStorage = (): { messages: UIMessage[]; durations: Record<string, number> } => {
  if (typeof window === 'undefined') return { messages: [], durations: {} };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { messages: [], durations: {} };

    const parsed = JSON.parse(stored);
    return {
      messages: parsed.messages || [],
      durations: parsed.durations || {},
    };
  } catch (error) {
    console.error('Failed to load messages from localStorage:', error);
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (messages: UIMessage[], durations: Record<string, number>) => {
  if (typeof window === 'undefined') return;
  try {
    const data: StorageData = { messages, durations };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save messages to localStorage:', error);
  }
};

/**
 * Types used for parsed book objects (expected from assistant JSON).
 */
type ParsedAltPick = {
  title?: string;
  reason?: string;
};

type ParsedBook = {
  title: string;
  author?: string;
  shortReason?: string;
  formats?: string[];
  difficulty?: string;
  altPick?: ParsedAltPick;
};

/**
 * Attempts to extract JSON representing an array of books from assistant message text.
 * Looks for a fenced ```json ... ``` block, otherwise tries to find any JSON array in the string.
 * Returns parsed array of ParsedBook or null if none.
 */
function tryParseBooksFromText(text: string): ParsedBook[] | null {
  if (!text) return null;

  // 1) Try fenced ```json ... ``` blocks first
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : null;

  // 2) If no fenced block, attempt to find a raw JSON array in the text
  const rawArrayMatch = candidate ? null : text.match(/(\[([\s\S]*?)\])/m);

  const jsonString = candidate ?? (rawArrayMatch ? rawArrayMatch[1] : null);

  if (!jsonString) return null;

  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return null;

    // Map/validate roughly to the ParsedBook shape
    const books: ParsedBook[] = parsed.map((b: any) => ({
      title: String(b.title ?? b.name ?? ""),
      author: b.author ?? b.by ?? "",
      shortReason: b.shortReason ?? b.reason ?? b.description ?? "",
      formats: Array.isArray(b.formats) ? b.formats.map(String) : [],
      difficulty: b.difficulty ?? b.level ?? "",
      altPick: b.altPick ?? b.alternative ?? undefined,
    })).filter(b => b.title && b.title.trim().length > 0);

    return books.length ? books : null;
  } catch (err) {
    // invalid JSON — ignore silently
    return null;
  }
}

/**
 * Helper: get full text content from a UIMessage (concatenate parts)
 */
function getMessageText(msg: UIMessage) {
  if (!msg.parts || !Array.isArray(msg.parts)) return "";
  return msg.parts.map(p => (typeof p === "string" ? p : (p as any).text ?? "")).join("\n");
}

/**
 * RecommendationCard component
 */
function RecommendationCard({ book, onShowSimilar } : { book: ParsedBook; onShowSimilar?: (title: string) => void }) {
  return (
    <div className="border rounded-2xl p-4 shadow-sm bg-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-lg leading-tight">{book.title}</div>
          {book.author ? <div className="text-sm text-gray-600 mb-2">by {book.author}</div> : null}
          {book.shortReason ? <div className="text-sm mb-3">{book.shortReason}</div> : null}
          <div className="text-xs text-gray-600 mb-2">Formats: {book.formats && book.formats.length ? book.formats.join(", ") : "N/A"}</div>
          <div className="text-xs mb-3">Difficulty: <span className="font-medium">{book.difficulty || "Unknown"}</span></div>
          {book.altPick && (book.altPick.title || book.altPick.reason) ? (
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-xs font-medium">Alternative</div>
              <div className="text-xs">{book.altPick.title || ""}{book.altPick.reason ? ` — ${book.altPick.reason}` : ""}</div>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => onShowSimilar?.(book.title)}
            className="text-xs px-3 py-2 rounded-full border hover:bg-muted-foreground/5"
            aria-label={`Show similar to ${book.title}`}
          >
            Show similar
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * RecommendationGrid component
 */
function RecommendationGrid({ books, onShowSimilar } : { books: ParsedBook[]; onShowSimilar?: (title: string) => void }) {
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl px-2">
      {books.map((b, i) => (
        <RecommendationCard key={i} book={b} onShowSimilar={onShowSimilar} />
      ))}
    </div>
  );
}

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const welcomeMessageShownRef = useRef<boolean>(false);

  const stored = typeof window !== 'undefined' ? loadMessagesFromStorage() : { messages: [], durations: {} };
  const [initialMessages] = useState<UIMessage[]>(stored.messages);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initialMessages,
  });

  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations);
    setMessages(stored.messages);
  }, []);

  useEffect(() => {
    if (isClient) {
      saveMessagesToStorage(messages, durations);
    }
  }, [durations, messages, isClient]);

  const handleDurationChange = (key: string, duration: number) => {
    setDurations((prevDurations) => {
      const newDurations = { ...prevDurations };
      newDurations[key] = duration;
      return newDurations;
    });
  };

  useEffect(() => {
    if (isClient && initialMessages.length === 0 && !welcomeMessageShownRef.current) {
      const welcomeMessage: UIMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: WELCOME_MESSAGE,
          },
        ],
      };
      setMessages([welcomeMessage]);
      saveMessagesToStorage([welcomeMessage], {});
      welcomeMessageShownRef.current = true;
    }
  }, [isClient, initialMessages.length, setMessages]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    sendMessage({ text: data.message });
    form.reset();
  }

  function clearChat() {
    const newMessages: UIMessage[] = [];
    const newDurations = {};
    setMessages(newMessages);
    setDurations(newDurations);
    saveMessagesToStorage(newMessages, newDurations);
    toast.success("Chat cleared");
  }

  /**
   * UI-only: find parsed books from the latest assistant message (if any).
   * This doesn't alter messages or backend; it just renders UI if backend included JSON.
   */
  const latestAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
  const parsedBooks = latestAssistantMessage ? tryParseBooksFromText(getMessageText(latestAssistantMessage)) : null;

  // Handler for the CTA on recommendation cards. This just sends a follow-up user message
  // asking for similar books. This keeps backend unchanged but makes the chat interactive.
  const handleShowSimilar = (title?: string) => {
    if (!title) return;
    // Insert a short user message asking for similar books
    sendMessage({ text: `Show me books similar to "${title}"` });
  };

  return (
    <div className="flex h-screen items-center justify-center font-sans dark:bg-black">
      <main className="w-full dark:bg-black h-screen relative">
        <div className="fixed top-0 left-0 right-0 z-50 bg-linear-to-b from-background via-background/50 to-transparent dark:bg-black overflow-visible pb-16">
          <div className="relative overflow-visible">
            <ChatHeader>
              <ChatHeaderBlock />
              <ChatHeaderBlock className="justify-center items-center">
                <Avatar
                  className="size-8 ring-1 ring-primary"
                >
                  <AvatarImage src="/logo.png" />
                  <AvatarFallback>
                    <Image src="/logo.png" alt="Logo" width={36} height={36} />
                  </AvatarFallback>
                </Avatar>
                <p className="tracking-tight">Chat with {AI_NAME}</p>
              </ChatHeaderBlock>
              <ChatHeaderBlock className="justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={clearChat}
                >
                  <Plus className="size-4" />
                  {CLEAR_CHAT_TEXT}
                </Button>
              </ChatHeaderBlock>
            </ChatHeader>
          </div>
        </div>
        <div className="h-screen overflow-y-auto px-5 py-4 w-full pt-[88px] pb-[150px]">
          <div className="flex flex-col items-center justify-end min-h-full">
            {isClient ? (
              <>
                <MessageWall messages={messages} status={status} durations={durations} onDurationChange={handleDurationChange} />
                {status === "submitted" && (
                  <div className="flex justify-start max-w-3xl w-full">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Book Recommendation Grid (UI-only): renders if latest assistant message contained structured JSON */}
                {parsedBooks && parsedBooks.length > 0 ? (
                  <RecommendationGrid books={parsedBooks} onShowSimilar={handleShowSimilar} />
                ) : null}
              </>
            ) : (
              <div className="flex justify-center max-w-2xl w-full">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-linear-to-t from-background via-background/50 to-transparent dark:bg-black overflow-visible pt-13">
          <div className="w-full px-5 pt-5 pb-1 items-center flex justify-center relative overflow-visible">
            <div className="message-fade-overlay" />
            <div className="max-w-3xl w-full">
              <form id="chat-form" onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Controller
                    name="message"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="chat-form-message" className="sr-only">
                          Message
                        </FieldLabel>
                        <div className="relative h-13">
                          <Input
                            {...field}
                            id="chat-form-message"
                            className="h-15 pr-15 pl-5 bg-card rounded-[20px]"
                            placeholder="Type your message here..."
                            disabled={status === "streaming"}
                            aria-invalid={fieldState.invalid}
                            autoComplete="off"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                form.handleSubmit(onSubmit)();
                              }
                            }}
                          />
                          {(status == "ready" || status == "error") && (
                            <Button
                              className="absolute right-3 top-3 rounded-full"
                              type="submit"
                              disabled={!field.value.trim()}
                              size="icon"
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                          )}
                          {(status == "streaming" || status == "submitted") && (
                            <Button
                              className="absolute right-2 top-2 rounded-full"
                              size="icon"
                              onClick={() => {
                                stop();
                              }}
                            >
                              <Square className="size-4" />
                            </Button>
                          )}
                        </div>
                      </Field>
                    )}
                  />
                </FieldGroup>
              </form>
            </div>
          </div>
          <div className="w-full px-5 py-3 items-center flex justify-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {OWNER_NAME}&nbsp;<Link href="/terms" className="underline">Terms of Use</Link>&nbsp;Powered by&nbsp;<Link href="https://ringel.ai/" className="underline">Ringel.AI</Link>
          </div>
        </div>
      </main>
    </div >
  );
}
