import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseGoalsSummaryResult {
  summary: string;
  loading: boolean;
  error: string | null;
}

// Cache to avoid re-summarizing the same goals
const summaryCache = new Map<string, string>();

export const useGoalsSummary = (goals: string | null | undefined): UseGoalsSummaryResult => {
  const [summary, setSummary] = useState<string>('Learning Goals');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!goals || goals.trim().length === 0) {
      setSummary('No Goals');
      setLoading(false);
      setError(null);
      return;
    }

    const trimmedGoals = goals.trim();
    
    // Check cache first
    if (summaryCache.has(trimmedGoals)) {
      setSummary(summaryCache.get(trimmedGoals)!);
      setLoading(false);
      setError(null);
      return;
    }

    // Generate new summary
    const generateSummary = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: functionError } = await supabase.functions.invoke('summarize-goals', {
          body: { goals: trimmedGoals }
        });

        if (functionError) {
          throw functionError;
        }

        const newSummary = data.summary || 'Learning Goals';
        setSummary(newSummary);
        
        // Cache the result
        summaryCache.set(trimmedGoals, newSummary);
        
      } catch (err) {
        console.error('Error generating goals summary:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate summary');
        
        // Fallback to simple word extraction
        const words = trimmedGoals.split(' ').slice(0, 3).join(' ');
        const fallbackSummary = words.length > 20 ? words.substring(0, 20) + '...' : words || 'Learning Goals';
        setSummary(fallbackSummary);
      } finally {
        setLoading(false);
      }
    };

    generateSummary();
  }, [goals]);

  return { summary, loading, error };
};