import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    startedSkatingYear: '',
    stance: '',
    gender: '',
    birthdayMonth: '',
    birthdayDay: '',
    birthdayYear: '',
    learningGoals: ''
  });

  const steps = [
    'Tell us about yourself',
    'Welcome to SkateCoach!',
    'Upload your videos',
    '5 free uploads a month'
  ];

  const progressValue = ((currentStep + 1) / steps.length) * 100;

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      await completeOnboarding();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const birthday = `${formData.birthdayYear}-${formData.birthdayMonth.padStart(2, '0')}-${formData.birthdayDay.padStart(2, '0')}`;

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          started_skating_year: parseInt(formData.startedSkatingYear),
          stance: formData.stance,
          gender: formData.gender,
          birthday,
          learning_goals: formData.learningGoals,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Welcome to SkateCoach!",
        description: "Your profile has been set up successfully.",
      });

      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Tell us about yourself.</h2>
              <p className="text-gray-600">It lets us know how we should coach you.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Alex"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Rodriguez"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Started Skating</Label>
                <Select value={formData.startedSkatingYear} onValueChange={(value) => handleInputChange('startedSkatingYear', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="2018" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Stance</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={formData.stance === 'regular' ? 'default' : 'outline'}
                    className="h-12"
                    onClick={() => handleInputChange('stance', 'regular')}
                  >
                    Regular
                  </Button>
                  <Button
                    type="button"
                    variant={formData.stance === 'goofy' ? 'default' : 'outline'}
                    className="h-12"
                    onClick={() => handleInputChange('stance', 'goofy')}
                  >
                    Goofy
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={formData.gender === 'male' ? 'default' : 'outline'}
                    className="h-12"
                    onClick={() => handleInputChange('gender', 'male')}
                  >
                    Male
                  </Button>
                  <Button
                    type="button"
                    variant={formData.gender === 'female' ? 'default' : 'outline'}
                    className="h-12"
                    onClick={() => handleInputChange('gender', 'female')}
                  >
                    Female
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Birthday</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={formData.birthdayMonth} onValueChange={(value) => handleInputChange('birthdayMonth', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="June" />
                    </SelectTrigger>
                    <SelectContent>
                      {['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                        <SelectItem key={month} value={(index + 1).toString()}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={formData.birthdayDay} onValueChange={(value) => handleInputChange('birthdayDay', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="15" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={formData.birthdayYear} onValueChange={(value) => handleInputChange('birthdayYear', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="1995" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - 10 - i).map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="learningGoals">Anything you want to learn?</Label>
                <Textarea
                  id="learningGoals"
                  value={formData.learningGoals}
                  onChange={(e) => handleInputChange('learningGoals', e.target.value)}
                  placeholder="I want to master kickflips and heelflips, and eventually learn tre flips. Also working on improving my balance and consistency with basic tricks."
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6 text-center">
            <div className="w-64 h-64 mx-auto bg-gray-100 rounded-xl flex items-center justify-center">
              <div className="text-6xl">🛹</div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Welcome to SkateCoach!</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                From ollies to switch hardflips, you'll learn how to balance, position your feet, pop, flick and land tricks.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 text-center">
            <div className="w-64 h-64 mx-auto bg-gray-100 rounded-xl flex items-center justify-center">
              <div className="text-6xl">📹</div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Just upload your video</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                And a coach will drop in notes for landing your trick right on the bolts.
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 text-center">
            <div className="w-64 h-64 mx-auto bg-gray-100 rounded-xl flex items-center justify-center">
              <div className="text-6xl">⚡</div>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">5 free uploads a month.</h2>
              <p className="text-xl font-semibold">Or upgrade for unlimited.</p>
              <div className="space-y-2 text-gray-600">
                <p>Upload all the videos you want for just $5/month, plus chat with a coach to get tips on the fly.</p>
                <p>For the price of a coffee, you can learn to skate so much faster.</p>
              </div>
              
              <div className="space-y-3 pt-4">
                <Button 
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white h-12"
                  onClick={handleNext}
                  disabled={loading}
                >
                  {loading ? 'Setting up...' : 'Go Pro'}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={completeOnboarding}
                  disabled={loading}
                >
                  Maybe Later
                </Button>
              </div>
              
              <p className="text-xs text-gray-500">
                Your videos are stored in the cloud for up to 180 days.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          {currentStep > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          
          <div className="flex justify-center flex-1">
            <div className="bg-gray-900 text-white rounded-lg p-2">
              <span className="text-xl font-bold">⚡</span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">SkateCoach</h1>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progressValue} className="h-2" />
        </div>

        {/* Step Content */}
        {renderStep()}

        {/* Next Button (for steps 0-2) */}
        {currentStep < 3 && (
          <Button 
            onClick={handleNext}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white h-12"
            disabled={
              currentStep === 0 && (!formData.firstName || !formData.lastName || !formData.startedSkatingYear || !formData.stance || !formData.gender)
            }
          >
            Next
          </Button>
        )}

        {/* Progress indicator */}
        <div className="flex justify-center space-x-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-200 ${
                index <= currentStep 
                  ? 'bg-gray-900 w-8' 
                  : 'bg-gray-200 w-2'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}