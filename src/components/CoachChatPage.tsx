import { useEffect, useRef } from "react";
import { Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface CoachChatPageProps {
  userFirstName?: string | null;
  messages: Array<{
    role: "user" | "coach";
    content: string;
    timestamp: number;
  }>;
  error: string | null;
  onQuickQuestion: (question: string) => void;
}

const QUICK_QUESTIONS = [
  "How can I ollie higher?",
  "Tips for landing kickflips consistently?",
  "What should I focus on as a beginner?",
  "Help me with my balance and stance",
];

export default function CoachChatPage({ 
  userFirstName, 
  messages, 
  error, 
  onQuickQuestion 
}: CoachChatPageProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Coach Chat • SkateCoach";
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  return (
    <div className="space-y-6 pb-32">
      <section className="space-y-1">
        <h1 className="text-2xl font-extralight text-gray-900">Coach</h1>
        <p className="text-gray-600">Chat with your personalized skating coach</p>
      </section>

      <div className="bg-white rounded-[8px] border border-gray-200 p-4 flex gap-3">
        <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
          <Bot className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{userFirstName ? `${userFirstName}‘s` : "Your"} SkateCoach</p>
          <p className="text-sm text-gray-600">Ask me anything about skateboarding techniques, tricks, drills, or get feedback on your uploaded videos.</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Quick Questions</h2>
        <div className="grid grid-cols-1 gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => onQuickQuestion(q)}
              className="w-full rounded-[8px] border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm text-left hover:bg-gray-50 active:translate-y-px transition"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Recent Conversation</h2>
        <div ref={listRef} className="space-y-3 pr-1">
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
                {m.role === "coach" ? (
                  <div className="prose prose-sm max-w-none leading-relaxed prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                )}
                <p className={`${m.role === "user" ? "text-white/70" : "text-gray-500"} text-[10px] mt-1`}>just now</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}