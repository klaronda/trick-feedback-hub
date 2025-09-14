import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Try signing in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
        }
      }
      // No success toast - user will be redirected automatically
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "Invalid credentials",
            description: "Please check your email and password and try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign in failed",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center pt-16 px-4">
      <div className="w-full max-w-sm">
        {/* Logo and Brand */}
        <div className="flex items-center justify-center mb-8">
          <div className="bg-gray-900 text-white rounded-lg p-2 flex items-center justify-center w-8 h-8 mr-3">
            <Zap className="w-4 h-4" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">SkateCoach</h1>
        </div>

        {/* Form Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">
            {isSignUp ? 'Create Account' : 'Welcome back'}
          </h2>
          <p className="text-gray-600 text-sm mt-2">
            {isSignUp 
              ? 'Start your skateboarding journey with personalized coaching'
              : 'Sign in to continue your skating journey'
            }
          </p>
        </div>

        {/* Form */}
        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
          {isSignUp && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                  First name
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Enter first name..."
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="mt-2 h-12 bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                  Last name
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Enter last name..."
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="mt-2 h-12 bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="youremail@sample.com"
              required
              value={formData.email}
              onChange={handleInputChange}
              disabled={loading}
              className="mt-2 h-12 bg-white border-gray-300 text-gray-900 placeholder-gray-400"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter password..."
              required
              value={formData.password}
              onChange={handleInputChange}
              disabled={loading}
              className="mt-2 h-12 bg-white border-gray-300 text-gray-900 placeholder-gray-400"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium mt-6"
            disabled={loading}
          >
            {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </Button>
        </form>

        {/* Toggle Sign Up/In */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            disabled={loading}
          >
            {isSignUp 
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"
            }
          </button>
        </div>

        {/* Terms */}
        {isSignUp && (
          <p className="text-xs text-gray-500 text-center mt-6">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        )}
      </div>
    </div>
  );
}