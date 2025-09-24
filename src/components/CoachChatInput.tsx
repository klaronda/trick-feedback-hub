import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface CoachChatInputProps {
  input: string;
  loading: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

export default function CoachChatInput({ 
  input, 
  loading, 
  onInputChange, 
  onSend 
}: CoachChatInputProps) {
  return (
    <div className="fixed bottom-[64px] left-0 right-0 bg-white border-t border-gray-200 pt-4 px-4 pb-8 z-40">
      <div className="mx-auto max-w-sm flex items-center gap-2">
        <Input
          placeholder="Ask Coach something..."
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          className="border border-gray-200 bg-white focus-visible:ring-0 focus-visible:ring-offset-0"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <Button 
          onClick={onSend} 
          disabled={loading || !input.trim()} 
          className="h-9 aspect-square p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}