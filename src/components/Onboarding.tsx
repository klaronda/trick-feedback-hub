import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import onboardingUploadImage from '@/assets/onboarding-upload.jpg';
import onboardingUpgradeImage from '@/assets/onboarding-upgrade.jpg';

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  // Calculate default birthday (today minus 4 years)
  const today = new Date();
  const defaultBirthYear = today.getFullYear() - 4;
  const defaultBirthMonth = (today.getMonth() + 1).toString();
  const defaultBirthDay = today.getDate().toString();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    startedSkatingYear: '2025',
    stance: '',
    gender: '',
    birthdayMonth: defaultBirthMonth,
    birthdayDay: defaultBirthDay,
    birthdayYear: defaultBirthYear.toString(),
    learningGoals: ''
  });

  // Load user's name from auth metadata
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata) {
        setFormData(prev => ({
          ...prev,
          firstName: user.user_metadata.first_name || '',
          lastName: user.user_metadata.last_name || ''
        }));
      }
    };
    loadUserData();
  }, []);

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
                    placeholder="Enter first name..."
                    className="bg-white placeholder:text-gray-400/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Enter last name..."
                    className="bg-white placeholder:text-gray-400/60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Started Skating</Label>
                <Select value={formData.startedSkatingYear} onValueChange={(value) => handleInputChange('startedSkatingYear', value)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="2025" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {Array.from({ length: 57 }, (_, i) => new Date().getFullYear() - i).map(year => (
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
                    variant="outline"
                    className={`h-12 transition-all duration-200 ${
                      formData.stance === 'regular' 
                        ? 'bg-gray-900 text-white font-bold border-gray-900 hover:bg-gray-700 hover:text-white hover:shadow-lg hover:scale-105' 
                        : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleInputChange('stance', 'regular')}
                  >
                    Regular
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-12 transition-all duration-200 ${
                      formData.stance === 'goofy' 
                        ? 'bg-gray-900 text-white font-bold border-gray-900 hover:bg-gray-700 hover:text-white hover:shadow-lg hover:scale-105' 
                        : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                    }`}
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
                    variant="outline"
                    className={`h-12 transition-all duration-200 ${
                      formData.gender === 'male' 
                        ? 'bg-gray-900 text-white font-bold border-gray-900 hover:bg-gray-700 hover:text-white hover:shadow-lg hover:scale-105' 
                        : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleInputChange('gender', 'male')}
                  >
                    Male
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-12 transition-all duration-200 ${
                      formData.gender === 'female' 
                        ? 'bg-gray-900 text-white font-bold border-gray-900 hover:bg-gray-700 hover:text-white hover:shadow-lg hover:scale-105' 
                        : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleInputChange('gender', 'female')}
                  >
                    Female
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Birthday</Label>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <Select value={formData.birthdayMonth} onValueChange={(value) => handleInputChange('birthdayMonth', value)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                        <SelectItem key={month} value={(index + 1).toString()}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Select value={formData.birthdayDay} onValueChange={(value) => handleInputChange('birthdayDay', value)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Select value={formData.birthdayYear} onValueChange={(value) => handleInputChange('birthdayYear', value)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {Array.from({ length: 56 }, (_, i) => new Date().getFullYear() - 4 - i).map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="learningGoals">Anything you want to learn?</Label>
                <Textarea
                  id="learningGoals"
                  value={formData.learningGoals}
                  onChange={(e) => handleInputChange('learningGoals', e.target.value)}
                  placeholder="I want to learn..."
                  className="min-h-[100px] bg-white placeholder:text-gray-400/60"
                />
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6 text-center">
            <div className="w-64 h-64 mx-auto rounded-xl overflow-hidden">
              <img 
                src={onboardingUploadImage} 
                alt="Camera setup for video recording"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900">Just upload your video.</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                And a coach will drop in notes for landing your trick right on the bolts.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 text-center">
            <div className="w-64 h-64 mx-auto rounded-xl overflow-hidden">
              <img 
                src={onboardingUpgradeImage} 
                alt="Graffiti wall skateboarding scene"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-gray-900">5 free uploads a month.</h2>
                <h2 className="text-2xl font-semibold text-gray-900">Or upgrade for unlimited.</h2>
              </div>
              <div className="space-y-2 text-gray-600">
                <p>Upload all the videos you want for just $5/month, plus chat with a coach to get tips on the fly.</p>
                <p>For the price of a coffee, you can learn to skate so much faster.</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with white background - fixed height for consistency */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 h-[120px]">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gray-900 text-white rounded p-2 flex items-center justify-center">
                <Zap className="h-5 w-5" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900">SkateCoach</h1>
            </div>
          </div>
          
          {/* Progress bar and back button row - positioned consistently */}
          <div className={`flex items-center space-x-3 ${currentStep === 0 ? 'mt-[28px]' : 'mt-4'}`}>
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleBack}
                className="h-8 w-8 rounded-full border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
              <div 
                className="h-full bg-gray-900 transition-all duration-300 ease-in-out"
                style={{ width: `${progressValue}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Body content with gray background */}
      <div className="p-4 pt-8">
        <div className="w-full max-w-sm mx-auto">
          {/* Step Content */}
          {renderStep()}
        </div>
      </div>

      {/* Sticky footer with buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="w-full max-w-sm mx-auto space-y-3">
          {/* Buttons for different steps */}
          {currentStep === 0 && (
            <Button 
              onClick={handleNext}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white h-12"
              disabled={
                !formData.firstName || !formData.lastName || !formData.startedSkatingYear || !formData.stance || !formData.gender
              }
            >
              Next
            </Button>
          )}

          {currentStep === 1 && (
            <Button 
              onClick={handleNext}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white h-12"
            >
              Next
            </Button>
          )}

          {currentStep === 2 && (
            <div className="space-y-3">
              <Button 
                className="w-full bg-gray-900 hover:bg-gray-800 text-white h-12"
                onClick={handleNext}
                disabled={loading}
              >
                {loading ? 'Setting up...' : 'Go Pro'}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-gray-600 hover:text-gray-900"
                onClick={completeOnboarding}
                disabled={loading}
              >
                Maybe Later
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Your videos are stored in the cloud for up to 180 days.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}