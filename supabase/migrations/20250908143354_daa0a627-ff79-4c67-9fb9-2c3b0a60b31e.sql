-- Create storage policies for the videos bucket
-- Allow authenticated users to upload their own videos
CREATE POLICY "Users can upload their own videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view their own videos
CREATE POLICY "Users can view their own videos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own videos
CREATE POLICY "Users can update their own videos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own videos
CREATE POLICY "Users can delete their own videos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);