import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBar, useNotificationBar } from '@/components/ui/notification-bar';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  
  const navigate = useNavigate();
  const location = useLocation();
  const { notification, showNotification, hideNotification } = useNotificationBar();

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
        showNotification('You successfully signed in.', 'success');
        // Delay navigation to show notification
        setTimeout(() => {
          navigate('/');
        }, 500);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'firstName':
        return value.trim() === '' ? 'First name is required' : '';
      case 'lastName':
        return value.trim() === '' ? 'Last name is required' : '';
      case 'email':
        if (value.trim() === '') return 'Email address is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        return '';
      case 'password':
        if (value.trim() === '') return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        return '';
      default:
        return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {
      firstName: isSignUp ? validateField('firstName', formData.firstName) : '',
      lastName: isSignUp ? validateField('lastName', formData.lastName) : '',
      email: validateField('email', formData.email),
      password: validateField('password', formData.password)
    };
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setLoading(false);
      return;
    }
    
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
          showNotification('This email is already registered. Try signing in instead.', 'error');
        } else {
          showNotification(error.message, 'error');
        }
      }
      // No success toast - user will be redirected automatically
    } catch (error) {
      showNotification('An unexpected error occurred. Please try again.', 'error');
    }

    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setLoading(false);
      return;
    }
    
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          showNotification('Please check your email and password and try again.', 'error');
        } else {
          showNotification(error.message, 'error');
        }
      }
    } catch (error) {
      showNotification('An unexpected error occurred. Please try again.', 'error');
    }

    setLoading(false);
  };

  return (
    <>
      <NotificationBar
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onHide={hideNotification}
      />
      <div className="min-h-screen bg-gray-50 flex justify-center pt-16 px-4">
        <div className="w-full max-w-sm">
          {/* Logo and Brand */}
          <div className="flex items-left justify-left mb-8">
            <div className="bg-gray-900 text-white rounded-lg p-2 flex items-left justify-left w-8 h-8 mr-3">
              <Zap className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">SkateCoach</h1>
          </div>

          {/* Form Title */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900">
              {isSignUp ? 'Create a SkateCoach account.' : 'Yo! Welcome back.'}
            </h2>
            <p className="text-gray-600 text-sm mt-2">
              {isSignUp 
                ? 'Start your skateboarding coaching journey.'
                : 'Sign in to continue your skating journey.'
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
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={loading}
                    className={`mt-2 bg-white text-gray-900 placeholder:text-gray-400/60 ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-600 mt-1">{errors.firstName}</p>
                  )}
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
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={loading}
                    className={`mt-2 bg-white text-gray-900 placeholder:text-gray-400/60 ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-600 mt-1">{errors.lastName}</p>
                  )}
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
                value={formData.email}
                onChange={handleInputChange}
                disabled={loading}
                className={`mt-2 bg-white text-gray-900 placeholder:text-gray-400/60 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email}</p>
              )}
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
                value={formData.password}
                onChange={handleInputChange}
                disabled={loading}
                className={`mt-2 bg-white text-gray-900 placeholder:text-gray-400/60 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">{errors.password}</p>
              )}
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
          <div className="mt-6">
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
            <p className="text-xs text-gray-500 mt-6">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          )}
        </div>
      </div>
    </>
  );
}