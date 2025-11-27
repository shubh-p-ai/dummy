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
import { ArrowUp, Eraser, Loader2, Square } from "lucide-react"; 
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
    // 1. Define the Welcome Message
    const welcomeMessage: UIMessage = {
      id: `welcome-${Date.now()}`,
      role: "assistant",
      parts: [
        {
          type: "text",
          // Use your WELCOME_MESSAGE constant
          text: WELCOME_MESSAGE,
        },
      ],
    };
    const newMessages: UIMessage[] = [welcomeMessage];
    const newDurations = {};
    // 2. Update state to show the welcome message
    setMessages(newMessages);
    setDurations(newDurations);
    // 3. Update localStorage so the message persists after refresh
    saveMessagesToStorage(newMessages, newDurations);
    // Optional: Reset the ref to allow the initial welcome message logic to run 
    // again if the component were to be unmounted and remounted without a full page refresh
    // Though not strictly necessary with the fix above, it ensures consistency.
    welcomeMessageShownRef.current = true; 
    toast.success("Chat cleared");
  }

  return (
    // Ensure main container is fully dark
    <div className="flex h-screen items-center justify-center font-sans bg-background">
      <main className="w-full bg-background h-screen relative">
        {/* Header: Solid background, no fade/transparency */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-background overflow-visible pb-4 shadow-sm">
          <div className="relative overflow-visible">
            <ChatHeader>
              <ChatHeaderBlock className="justify-start">
                  <Avatar
                    className="size-8 ring-1 ring-primary"
                  >
                    <AvatarImage src="/logo.png" />
                    <AvatarFallback>
                      <Image src="/logo.png" alt="Logo" width={50} height={50} />
                    </AvatarFallback>
                  </Avatar>
                  <p className="ml-3 text-2xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500">{AI_NAME}</p>
              </ChatHeaderBlock>
              <ChatHeaderBlock className="justify-center items-center">
              </ChatHeaderBlock>
              <ChatHeaderBlock className="justify-end">
                <Button
                  // Use primary color for 'New Chat' button text/icon
                  variant="outline"
                  size="sm"
                  className="cursor-pointer border-primary text-primary hover:bg-primary/5"
                  onClick={clearChat}
                >
                  <Eraser className="size-4 mr-1" />
                  {CLEAR_CHAT_TEXT}
                </Button>
              </ChatHeaderBlock>
            </ChatHeader>
          </div>
        </div>
        {/* Chat Wall: Use solid background class */}
        <div className="h-screen overflow-y-auto px-5 py-4 w-full pt-[88px] pb-[150px] chat-wall-container">
          <div className="flex flex-col items-center justify-end min-h-full">
            {isClient ? (
              <>
                <MessageWall messages={messages} status={status} durations={durations} onDurationChange={handleDurationChange} />
                {status === "submitted" && (
                  <div className="flex justify-start max-w-3xl w-full">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center max-w-2xl w-full">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
        {/* Footer/Input Area: Solid background, no fade/transparency, and dark color */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background overflow-visible pt-5 shadow-lg">
          <div className="w-full px-5 pt-0 pb-1 items-center flex justify-center relative overflow-visible">
            {/* Removed message-fade-overlay class here */}
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
                            // Input now uses bg-input (dark gray) and rounded-[25px]
                            className="h-15 pr-15 pl-5 bg-purple-600 border-border rounded-[25px] placeholder:text-white" 
                            placeholder="Recommend me a fantasy novel, or a biography..."
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
                              // Send button uses solid primary color (magenta/purple)
                              className="absolute right-3 top-3 rounded-full bg-black hover:bg-gray-800"
                              type="submit"
                              disabled={!field.value.trim()}
                              size="icon"
                            >
                              <ArrowUp className="size-4 text-white" />
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
    </div>
  );
}
