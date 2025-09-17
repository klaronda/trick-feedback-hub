import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { usePersonalizedCoach } from "@/hooks/usePersonalizedCoach";
import { Bot, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CoachChatProps {
  userFirstName?: string | null;
}

type ChatMessage = {
  role: "user" | "coach";
  content: string;
  timestamp: number;
};

const QUICK_QUESTIONS = [
  "How can I ollie higher?",
  "Tips for landing kickflips consistently?",
  "What should I focus on as a beginner?",
  "Help me with my balance and stance",
];

export default function CoachChat({ userFirstName }: CoachChatProps) {
  const { sendMessage, loading, error } = usePersonalizedCoach();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const storageKey = useMemo(
    () => (userId ? `coach-chat-${userId}` : "coach-chat"),
    [userId]
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setMessages(JSON.parse(raw));
    } catch (e) {
      console.warn("Failed to load messages from storage", e);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      const lastTen = messages.slice(-10);
      localStorage.setItem(storageKey, JSON.stringify(lastTen));
    } catch (e) {
      // ignore
    }
  }, [messages, storageKey]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    document.title = "Coach Chat • SkateCoach";
  }, [messages]);

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;

    const userMsg: ChatMessage = { role: "user", content, timestamp: Date.now() };
    setMessages((prev) => [...prev.slice(-9), userMsg]);
    setInput("");

    const res = await sendMessage(content, "general_coaching");
    if (res?.response) {
      const coachMsg: ChatMessage = {
        role: "coach",
        content: res.response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev.slice(-9), coachMsg]);
    } else if (error) {
      toast({ title: "Coach error", description: error, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-2xl font-extralight text-foreground">Coach Chat</h1>
        <p className="text-muted-foreground">Get advice to help improve your skating.</p>
      </section>

      <article className="rounded-lg border border-border bg-card p-4 flex gap-3">
        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
          <Bot className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground">{userFirstName ? `${userFirstName}'s` : "Your"} SkateCoach</p>
          <p className="text-sm text-muted-foreground">Ask me anything about skateboarding techniques, tricks, drills, or get feedback on your uploaded videos.</p>
        </div>
      </article>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Quick Questions</h2>
        <div className="grid grid-cols-1 gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm text-left hover:bg-muted/80 active:translate-y-px transition"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3 pb-28">
        <h2 className="text-sm font-semibold text-foreground">Recent Conversation</h2>
        <div ref={listRef} className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">No messages yet. Try a quick question above.</p>
          )}
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`${
                  m.role === "user"
                    ? "bg-foreground text-background"
                    : "bg-card border border-border text-foreground"
                } max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                <p className={`${m.role === "user" ? "text-background/70" : "text-muted-foreground"} text-[10px] mt-1`}>just now</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="fixed left-4 right-4 bottom-20">
        <div className="mx-auto max-w-sm rounded-xl border border-border bg-background shadow-sm p-1.5 flex items-center gap-2">
          <Input
            placeholder="Ask Coach something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button onClick={() => handleSend()} disabled={loading} className="h-9 aspect-square p-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
