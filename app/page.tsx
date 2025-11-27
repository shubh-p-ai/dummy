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
import { ArrowUp, Square, Loader2 } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader } from "@/app/parts/chat-header";
import { ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config";
import Image from "next/image";
import Link from "next/link";

import Sidebar from "@/components/Sidebar";
import RecommendationCard, { ParsedBook } from "@/components/RecommendationCard";

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

// Keep your existing parsing utilities
type ParsedAltPick = {
  title?: string;
  reason?: string;
};

type PageParsedBook = {
  title: string;
  author?: string;
  shortReason?: string;
  formats?: string[];
  difficulty?: string;
  altPick?: ParsedAltPick;
};

function tryParseBooksFromText(text: string): PageParsedBook[] | null {
  if (!text) return null;

  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : null;
  const rawArrayMatch = candidate ? null : text.match(/(\[([\s\S]*?)\])/m);
  const jsonString = candidate ?? (rawArrayMatch ? rawArrayMatch[1] : null);

  if (!jsonString) return null;

  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return null;

    const books: PageParsedBook[] = parsed.map((b: any) => ({
      title: String(b.title ?? b.name ?? ""),
      author: b.author ?? b.by ?? "",
      shortReason: b.shortReason ?? b.reason ?? b.description ?? "",
      formats: Array.isArray(b.formats) ? b.formats.map(String) : [],
      difficulty: b.difficulty ?? b.level ?? "",
      altPick: b.altPick ?? b.alternative ?? undefined,
    })).filter(b => b.title && b.title.trim().length > 0);

    return books.length ? books : null;
  } catch (err) {
    return null;
  }
}

function getMessageText(msg: UIMessage) {
  if (!msg.parts || !Array.isArray(msg.parts)) return "";
  return msg.parts.map(p => (typeof p === "string" ? p : (p as any).text ?? "")).join("\n");
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

  const latestAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
  const parsedBooks = latestAssistantMessage ? tryParseBooksFromText(getMessageText(latestAssistantMessage)) : null;

  const handleShowSimilar = (title?: string) => {
    if (!title) return;
    sendMessage({ text: `Show me books similar to "${title}"` });
  };

  // Handler passed into Sidebar to trigger quick prompts / genres
  const handlePromptClick = (prompt: string) => {
    // Use the same sending path as the form so the backend receives a user message
    sendMessage({ text: prompt });
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar onNewChat={clearChat} onPromptClick={handlePromptClick} />

      {/* Main chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-card/60 px-6 py-4 sticky top-0 z-20">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-8 ring-1 ring-primary">
                <AvatarImage src="/logo.png" />
                <AvatarFallback>BR</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-lg font-semibold">Chat with {AI_NAME}</div>
                <div className="text-sm text-muted-foreground">Recommend books using Goodreads best lists, descriptions and ratings</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={clearChat}>
                {CLEAR_CHAT_TEXT}
              </Button>
            </div>
          </div>
        </div>

        {/* Messages + recommendations area */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-5xl mx-auto flex gap-8">
            {/* Chat column */}
            <div className="flex-1">
              <div className="mb-4">
                {isClient ? (
                  <MessageWall messages={messages} status={status} durations={durations} onDurationChange={handleDurationChange} />
                ) : (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="animate-spin" />
                  </div>
                )}
              </div>

              {status === "submitted" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="animate-spin" />
                  <div>Fetching recommendations…</div>
                </div>
              )}
            </div>

            {/* Recommendations rail (only shown on md+) */}
            <aside className="hidden lg:block lg:w-96 shrink-0">
              <div className="sticky top-[96px]">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold">Top picks</h4>
                  <p className="text-xs text-muted-foreground">If assistant returned structured book suggestions, you'll see them here.</p>
                </div>

                <div className="flex flex-col gap-3">
                  {parsedBooks && parsedBooks.length ? (
                    parsedBooks.map((b, i) => (
                      <RecommendationCard key={i} book={b as ParsedBook} onShowSimilar={handleShowSimilar} />
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No structured recommendations detected in the latest assistant reply.</div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </main>

        {/* Input area */}
        <div className="border-t bg-card/60 px-6 py-4 sticky bottom-0 z-30">
          <div className="max-w-5xl mx-auto">
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
                      <div className="relative">
                        <Input
                          {...field}
                          id="chat-form-message"
                          className="pr-20 rounded-xl"
                          placeholder="Ask BookRecomm for suggestions — e.g. 'books like The Martian' or 'top fantasy novels under 400 pages'"
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
                        {(status === "ready" || status === "error") && (
                          <Button
                            className="absolute right-2 top-1.5 rounded-full"
                            type="submit"
                            disabled={!field.value.trim()}
                            size="icon"
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                        )}
                        {(status === "streaming" || status === "submitted") && (
                          <Button
                            className="absolute right-2 top-1.5 rounded-full"
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

          <div className="max-w-5xl mx-auto mt-3 text-xs text-muted-foreground">
            © {new Date().getFullYear()} {OWNER_NAME} • <Link href="/terms" className="underline">Terms</Link> • Powered by Ringel.AI
          </div>
        </div>
      </div>
    </div>
  );
}
