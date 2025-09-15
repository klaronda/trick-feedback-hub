import { useState, useEffect } from "react";
import { Play, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface TrickAttempt {
  id: string;
  trick_name: string | null;
  created_at: string;
  status: string;
  analysis_data: any;
}

interface RecentUploadsProps {
  onViewDetails: (id: string) => void;
  onUploadNew: () => void;
  onViewAll: () => void;
}

export const RecentUploads = ({ onViewDetails, onUploadNew, onViewAll }: RecentUploadsProps) => {
  const [attempts, setAttempts] = useState<TrickAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentAttempts();
  }, []);

  const fetchRecentAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('trick_attempts')
        .select('id, trick_name, created_at, status, analysis_data')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setAttempts(data || []);
    } catch (error) {
      console.error('Error fetching recent attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge variant="completed">Completed</Badge>;
      case 'processing':
        return <Badge variant="processing">Processing</Badge>;
      case 'pending':
        return <Badge variant="pending">Pending</Badge>;
      default:
        return <Badge variant="pending">{status}</Badge>;
    }
  };

  const getScore = (analysisData: any) => {
    if (analysisData?.score) {
      return `${analysisData.score}/10`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Uploads</h2>
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 text-sm">
            View All
          </Button>
        </div>
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Uploads</h2>
          <Button variant="ghost" size="sm" onClick={onViewAll} className="text-gray-600 hover:text-gray-900 text-sm">
            View All
          </Button>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Upload Your First Video</h3>
          <p className="text-sm text-gray-600 mb-4">
            Start your skateboarding journey by uploading a video of your trick attempt.
          </p>
          <Button onClick={onUploadNew} className="w-full bg-gray-900 hover:bg-gray-800 text-white h-10">
            <Upload className="w-4 h-4 mr-2" />
            Upload Video
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Recent Uploads</h2>
        <Button variant="ghost" size="sm" onClick={onViewAll} className="text-gray-600 hover:text-gray-900 text-sm">
          View All
        </Button>
      </div>

      <div className="space-y-3">
        {attempts.map((attempt) => (
          <div key={attempt.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm text-gray-900 truncate">
                    {attempt.trick_name || 'Untitled Trick'}
                  </h3>
                  {getStatusBadge(attempt.status)}
                </div>
                
                <p className="text-xs text-gray-600 mb-2">
                  {formatDistanceToNow(new Date(attempt.created_at), { addSuffix: true })}
                </p>
                
                {attempt.status === 'completed' && (
                  <p className="text-sm text-gray-600 mb-3">
                    Great progress on your {attempt.trick_name?.toLowerCase()}! Focus on keeping your shoulders aligned.
                  </p>
                )}
                
                {attempt.status === 'processing' && (
                  <p className="text-sm text-gray-600 mb-3">
                    We're reviewing your technique
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  {getScore(attempt.analysis_data) && (
                    <span className="text-sm font-medium text-gray-900">
                      Score: {getScore(attempt.analysis_data)}
                    </span>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onViewDetails(attempt.id)}
                    className="p-0 h-auto font-medium text-sm ml-auto text-gray-600 hover:text-gray-900"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};