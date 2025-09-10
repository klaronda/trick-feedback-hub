import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const Success = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home page after 3 seconds
    const timer = setTimeout(() => {
      navigate('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Thanks for upgrading!
          </h1>
          <p className="text-muted-foreground">
            Welcome to Skate Coach Pro! You now have access to unlimited uploads and advanced features.
          </p>
        </div>

        <div className="text-sm text-muted-foreground">
          Redirecting you back to your attempts in 3 seconds...
        </div>
      </Card>
    </div>
  );
};

export default Success;