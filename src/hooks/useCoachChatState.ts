import { useEffect, useMemo, useState } from "react";
import { usePersonalizedCoach } from "@/hooks/usePersonalizedCoach";
import { supabase } from "@/integrations/supabase/client";

type ChatMessage = {
  role: "user" | "coach";
  content: string;
  timestamp: number;
};

export const useCoachChatState = () => {
  const { sendMessage, loading, error } = usePersonalizedCoach();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

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
    }
  };

  return {
    messages,
    input,
    loading,
    error,
    setInput,
    handleSend
  };
};