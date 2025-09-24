import CoachChatPage from "@/components/CoachChatPage";

interface CoachChatProps {
  userFirstName?: string | null;
  messages: Array<{
    role: "user" | "coach";
    content: string;
    timestamp: number;
  }>;
  error: string | null;
  onQuickQuestion: (question: string) => void;
}

export default function CoachChat({ 
  userFirstName, 
  messages, 
  error, 
  onQuickQuestion 
}: CoachChatProps) {
  return (
    <CoachChatPage
      userFirstName={userFirstName}
      messages={messages}
      error={error}
      onQuickQuestion={onQuickQuestion}
    />
  );
}

