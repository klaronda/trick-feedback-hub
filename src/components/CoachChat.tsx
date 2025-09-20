import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { useToast } from "@/components/ui/use-toast"; // Removed to reduce toast notifications
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
  // const { toast } = useToast(); // Removed to reduce toast notifications
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
      // toast({ title: "Coach error", description: error, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-2xl font-extralight text-gray-900">Coach</h1>
        <p className="text-gray-600">Chat with your personalized skating coach</p>
      </section>

      <div className="bg-white rounded-[8px] border border-gray-200 p-4 flex gap-3">
        <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
          <Bot className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{userFirstName ? `${userFirstName}'s` : "Your"} SkateCoach</p>
          <p className="text-sm text-gray-600">Ask me anything about skateboarding techniques, tricks, drills, or get feedback on your uploaded videos.</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Quick Questions</h2>
        <div className="grid grid-cols-1 gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="w-full rounded-[8px] border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm text-left hover:bg-gray-50 active:translate-y-px transition"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3 pb-28">
        <h2 className="text-sm font-semibold text-gray-900">Recent Conversation</h2>
        <div ref={listRef} className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {messages.length === 0 && (
            <div className="bg-white rounded-[8px] border border-gray-200 p-4 text-center">
              <p className="text-sm text-gray-600">No messages yet. Try a quick question above or start typing below.</p>
            </div>
          )}
          {error && (
            <div className="bg-red-50 rounded-[8px] border border-red-200 p-4">
              <p className="text-sm text-red-600">Failed to connect to coach. Please try again.</p>
            </div>
          )}
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`${
                  m.role === "user"
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-200 text-gray-900"
                } max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                <p className={`${m.role === "user" ? "text-white/70" : "text-gray-500"} text-[10px] mt-1`}>just now</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="fixed left-0 right-0 bottom-20 bg-white border-t border-gray-200 p-4">
        <div className="mx-auto max-w-sm rounded-[8px] border border-gray-200 bg-white shadow-sm p-1.5 flex items-center gap-2">
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
          <Button 
            onClick={() => handleSend()} 
            disabled={loading || !input.trim()} 
            className="h-9 aspect-square p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
