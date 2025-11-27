// Chat.tsx (The main component file)

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
import { ArrowUp, Eraser, Loader2, Square, BookOpen, Star } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader } from "@/app/parts/chat-header";
import { ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// --- Book Data and BookSuggestions Component ---

// Define a type for the book data
type Book = {
  title: string;
  author: string;
  rating: number; // e.g., 4.5
  genre: string;
  imageUrl: string; // Placeholder for image URL
};

// Placeholder data for the top-rated books
const TOP_RATED_BOOKS: Book[] = [
  {
    title: "The Hunger Games",
    author: "Suzanne Collins",
    rating: 4.35,
    genre: "Young Adult, Fiction, Fantasy, Science Fiction, Adventure",
    imageUrl: "https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1586722975i/2767052.jpg",
  },
  {
    title: "Pride and Prejudice",
    author: "Jane Austen, Anna Quindlen",
    rating: 4.29,
    genre: "Classics, Romance, Fiction, Literature",
    imageUrl: "https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1320399351i/1885.jpg",
  },
  {
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    rating: 4.26,
    genre: "Classics, Fiction, Literature, Historical",
    imageUrl: "https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1553383690i/2657.jpg",
  },
];

// New component for displaying book suggestions
const BookSuggestions = () => (
  // REDUCED WIDTH: w-[250px] for lg, w-[300px] for xl
  <div className="hidden lg:block w-[300px] xl:w-[300px] bg-background border-l border-gray-800 fixed right-0 top-0 h-screen flex flex-col">
    
    {/* Fixed Heading (pt-[88px] accounts for the chat header height) */}
    <div className="p-4 pt-[88px] bg-background z-10 border-b border-gray-800 flex-shrink-0">
      <h3 className="text-xl font-bold text-white flex items-center">
        <BookOpen className="size-5 mr-2 text-purple-400" />
        Top Rated Reads
      </h3>
    </div>
    
    {/* Scrollable Book List - Uses custom-scrollbar-style */}
    <div className="flex-grow overflow-y-auto custom-scrollbar-style p-4"> 
      <div className="space-y-3"> {/* Reduced vertical spacing */}
        {TOP_RATED_BOOKS.map((book, index) => (
          <Card key={index} className="bg-gray-900 border-gray-700 text-white rounded-lg shadow-md"> {/* Reduced card styling */}
            <CardHeader className="p-3 flex flex-row items-start"> {/* Reduced padding */}
               {/* REDUCED IMAGE SIZE: w-12 h-18 */}
               <div className="flex-shrink-0 w-15 h-15 bg-gray-700 rounded-sm overflow-hidden relative mr-3"> 
                 <Image
                    src={book.imageUrl}
                    alt={`${book.title} cover`}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="opacity-80"
                 />
               </div>
               <div>
                  {/* REDUCED TITLE SIZE: text-base */}
                  <CardTitle className="text-base font-semibold leading-snug text-purple-400 line-clamp-2">
                      {book.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400 mt-1"> {/* Reduced description size */}
                      {book.author}
                  </CardDescription>
               </div>
            </CardHeader>
            <CardContent className="px-3 pb-2 pt-0 text-xs"> {/* Reduced padding and text size */}
              <p className="text-gray-400 mb-1 line-clamp-1">
                  <span className="font-medium text-gray-300">Genre:</span> {book.genre}
              </p>
              <div className="flex items-center text-yellow-400">
                  <Star className="size-3 fill-yellow-400 mr-1" />
                  <span className="font-bold">{book.rating}</span>/5
              </div>
            </CardContent>
            <CardFooter className="px-3 pb-3 pt-0">
               <Link href="#" className="text-[10px] text-purple-300 hover:text-purple-400 underline transition-colors">
                  View on GoodReads
               </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

// --- End of New Components ---

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

        {/* --- Main Content Area: Chat Wall and Suggestions --- */}
        <div className="flex h-full w-full">
            {/* Chat Wall Container: Takes all available width, adjusting for suggestions on large screens */}
            {/* UPDATED MAX-WIDTH to match new BookSuggestions width */}
            <div className="flex-grow min-w-0">
                {/* ADDED custom-scrollbar-style to chat wall */}
                <div className="h-screen overflow-y-auto custom-scrollbar-style px-5 py-4 w-full pt-[88px] pb-[150px] chat-wall-container lg:max-w-[calc(100vw-250px)] xl:max-w-[calc(100vw-300px)]">
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
            </div>

            {/* Book Suggestions Component - Fixed on the right side */}
            <BookSuggestions />
        </div>
        {/* --- End of Main Content Area --- */}


        {/* Footer/Input Area: Solid background, no fade/transparency, and dark color */}
        {/* UPDATED RIGHT MARGIN to match new BookSuggestions width */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background overflow-visible pt-5 shadow-lg lg:right-[250px] xl:right-[300px]">
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
