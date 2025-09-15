import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CoachResponse {
  response: string;
  userContext: {
    age: number;
    readingLevel: string;
    name: string;
    stance: string;
    experience: number | null;
  };
}

interface UsePersonalizedCoachReturn {
  sendMessage: (message: string, context?: 'general' | 'trick_analysis' | 'general_coaching') => Promise<CoachResponse | null>;
  loading: boolean;
  error: string | null;
}

export function usePersonalizedCoach(): UsePersonalizedCoachReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (
    message: string, 
    context: 'general' | 'trick_analysis' | 'general_coaching' = 'general'
  ): Promise<CoachResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('personalized-coach', {
        body: { message, context }
      });

      if (error) {
        throw new Error(error.message || 'Failed to get coaching response');
      }

      setLoading(false);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  };

  return {
    sendMessage,
    loading,
    error
  };
}