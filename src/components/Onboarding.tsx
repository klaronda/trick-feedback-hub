import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
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
      body: "And a coach will drop notes on how you can land your tricks right on the bolts.",
      primaryButton: { text: "Next", action: handleNext },
    },
    {
      image: upgradeImage,
      header: "You get 5 free uploads per month.",
      body: "Add a video plan for just $5/month for unlimited videos, and you can chat with with coach to get tips on the fly.\n\nFor the price of a coffee, you'll learn to skate so much faster.",
      primaryButton: { text: isUpgrading ? "Processing..." : "Go Pro", action: handleUpgrade, disabled: isUpgrading },
      secondaryButton: { text: "Maybe Later", action: onComplete },
    },
  ];

  const currentScreen = screens[currentStep];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-0">
          {/* Progress Bar */}
          <div className="p-6 pb-4">
            <Progress value={progress} className="w-full" />
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