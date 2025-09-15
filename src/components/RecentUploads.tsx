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
        return <Badge className="bg-green-500 text-white hover:bg-green-600">Completed</Badge>;
      case 'processing':
        return <Badge className="bg-orange-500 text-white hover:bg-orange-600">Processing</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
          <h2 className="text-lg font-semibold">Recent Uploads</h2>
          <Button variant="link" className="p-0 font-medium text-sm">
            View All
          </Button>
        </div>
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <Card key={i} className="bg-white border border-border">
              <CardContent className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Uploads</h2>
          <Button variant="link" className="p-0 font-medium text-sm">
            View All
          </Button>
        </div>
        
        <Card className="bg-white border border-border">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">Upload Your First Video</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start your skateboarding journey by uploading a video of your trick attempt.
            </p>
            <Button onClick={onUploadNew} className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Upload Video
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Uploads</h2>
        <Button variant="link" onClick={onViewAll} className="p-0 font-medium text-sm">
          View All
        </Button>
      </div>

      <div className="space-y-3">
        {attempts.map((attempt) => (
          <Card key={attempt.id} className="bg-white border border-border">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Play className="w-5 h-5 text-muted-foreground" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">
                      {attempt.trick_name || 'Untitled Trick'}
                    </h3>
                    {getStatusBadge(attempt.status)}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2">
                    {formatDistanceToNow(new Date(attempt.created_at), { addSuffix: true })}
                  </p>
                  
                  {attempt.status === 'Completed' && (
                    <p className="text-sm text-muted-foreground mb-3">
                      Great progress on your {attempt.trick_name?.toLowerCase()}! Focus on keeping your shoulders aligned.
                    </p>
                  )}
                  
                  {attempt.status === 'Processing' && (
                    <p className="text-sm text-muted-foreground mb-3">
                      We're reviewing your technique
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    {getScore(attempt.analysis_data) && (
                      <span className="text-sm font-medium">
                        Score: {getScore(attempt.analysis_data)}
                      </span>
                    )}
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => onViewDetails(attempt.id)}
                      className="p-0 h-auto font-medium text-sm ml-auto"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};