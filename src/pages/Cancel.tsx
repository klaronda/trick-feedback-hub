import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft } from "lucide-react";

const Cancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <XCircle className="w-16 h-16 text-amber-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Upgrade Cancelled
          </h1>
          <p className="text-muted-foreground">
            No worries! You can upgrade to Pro anytime to unlock unlimited uploads and advanced coaching features.
          </p>
        </div>

        <Button 
          onClick={() => navigate('/')} 
          className="w-full flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Attempts
        </Button>
      </Card>
    </div>
  );
};

export default Cancel;