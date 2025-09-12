import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import welcomeImage from "@/assets/onboarding-welcome.jpg";
import uploadImage from "@/assets/onboarding-upload.jpg";
import upgradeImage from "@/assets/onboarding-upgrade.jpg";

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const totalSteps = 3;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user?.email) {
        alert("You must be logged in to upgrade.");
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          customerEmail: user.email,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        onComplete();
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const screens = [
    {
      image: welcomeImage,
      header: "Welcome to SkateCoach!",
      body: "From ollies to switch hardflips, you'll learn how to balance, position your feet, pop, flick and land tricks.",
      primaryButton: { text: "Next", action: handleNext },
    },
    {
      image: uploadImage,
      header: "Just upload your video",
      body: "And a coach will drop in notes for landing your trick right on the bolts.",
      primaryButton: { text: "Next", action: handleNext },
    },
    {
      image: upgradeImage,
      header: "5 free uploads a month.\nOr upgrade for unlimited.",
      body: "Upload all the videos you want for just $5/month, plus chat with a coach to get tips on the fly.\n\nFor the price of a coffee, you can learn to skate so much faster.",
      primaryButton: { text: isUpgrading ? "Processing..." : "Go Pro", action: handleUpgrade, disabled: isUpgrading },
      secondaryButton: { text: "Maybe Later", action: onComplete },
    },
  ];

  const currentScreen = screens[currentStep];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-0">
          {/* Progress Bar with Back Button */}
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleBack}
                  className="flex-shrink-0 h-8 w-8 rounded-full"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <Progress value={progress} className="flex-1" />
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            {/* Image */}
            <div className="mb-8">
              <img
                src={currentScreen.image}
                alt="Onboarding illustration"
                className="w-full h-48 md:h-64 object-cover rounded-lg"
              />
            </div>

            {/* Header */}
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-4">
              {currentScreen.header}
            </h1>

            {/* Body */}
            <p className="text-muted-foreground text-center mb-8 leading-relaxed whitespace-pre-line">
              {currentScreen.body}
            </p>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={currentScreen.primaryButton.action}
                disabled={currentScreen.primaryButton.disabled}
                className="w-full"
                size="lg"
              >
                {currentScreen.primaryButton.text}
              </Button>
              
              {currentScreen.secondaryButton && (
                <Button
                  variant="outline"
                  onClick={currentScreen.secondaryButton.action}
                  className="w-full"
                  size="lg"
                >
                  {currentScreen.secondaryButton.text}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;