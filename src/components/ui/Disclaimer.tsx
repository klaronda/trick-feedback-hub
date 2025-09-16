import { Card } from "@/components/ui/card";

interface DisclaimerProps {
  children: React.ReactNode;
  className?: string;
}

export const Disclaimer = ({ children, className = "" }: DisclaimerProps) => {
  return (
    <Card className={`p-3 bg-muted/30 border-gray-200 ${className}`}>
      <p className="text-xs text-gray-600 text-center leading-relaxed">
        {children}
      </p>
    </Card>
  );
};