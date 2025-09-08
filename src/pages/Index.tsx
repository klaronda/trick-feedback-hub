import { useState } from "react";
import { VideoUpload } from "@/components/VideoUpload";
import { ProcessingScreen } from "@/components/ProcessingScreen";
import { ResultScreen } from "@/components/ResultScreen";
import { Navigation } from "@/components/Navigation";

type AppState = 'upload' | 'processing' | 'result';
type NavigationView = 'home' | 'clips';

const Index = () => {
  const [appState, setAppState] = useState<AppState>('upload');
  const [navigationView, setNavigationView] = useState<NavigationView>('home');
  const [uploadedVideo, setUploadedVideo] = useState<{
    file: File;
    path: string;
  } | null>(null);

  const handleUploadSuccess = (videoPath: string, file: File) => {
    setUploadedVideo({ file, path: videoPath });
    setAppState('processing');
  };

  const handleProcessingComplete = () => {
    setAppState('result');
  };

  const handleUploadAnother = () => {
    setUploadedVideo(null);
    setAppState('upload');
    setNavigationView('home');
  };

  const handleBackToUpload = () => {
    setAppState('upload');
  };

  if (appState === 'processing') {
    return <ProcessingScreen onProcessingComplete={handleProcessingComplete} />;
  }

  if (appState === 'result' && uploadedVideo) {
    return (
      <ResultScreen
        videoFile={uploadedVideo.file}
        videoPath={uploadedVideo.path}
        onUploadAnother={handleUploadAnother}
        onBack={handleBackToUpload}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-center">
            Skate Coach <span className="text-primary">(MVP)</span>
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">
              Upload your trick attempt and get feedback
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Record yourself attempting a skateboarding trick and receive AI-powered coaching feedback to improve your technique.
            </p>
          </div>

          <VideoUpload onUploadSuccess={handleUploadSuccess} />
        </div>
      </main>

      {/* Navigation */}
      <Navigation 
        currentView={navigationView} 
        onNavigate={setNavigationView}
      />
    </div>
  );
};

export default Index;
