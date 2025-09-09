-- Update user_monthly_uploads table structure
ALTER TABLE public.user_monthly_uploads 
ADD COLUMN IF NOT EXISTS month TEXT NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM');

-- Create unique constraint to ensure one record per user per month
ALTER TABLE public.user_monthly_uploads 
ADD CONSTRAINT unique_user_month UNIQUE (user_id, month);

-- Enable RLS on user_monthly_uploads table
ALTER TABLE public.user_monthly_uploads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_monthly_uploads
CREATE POLICY "Users can view their own upload counts" 
ON public.user_monthly_uploads 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own upload counts" 
ON public.user_monthly_uploads 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own upload counts" 
ON public.user_monthly_uploads 
FOR UPDATE 
USING (user_id = auth.uid());

-- Create function to increment monthly upload count
CREATE OR REPLACE FUNCTION public.increment_monthly_uploads(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    current_month TEXT;
    current_uploads INTEGER;
BEGIN
    current_month := to_char(CURRENT_DATE, 'YYYY-MM');
    
    -- Insert or update the current month's upload count
    INSERT INTO public.user_monthly_uploads (user_id, uploads_this_month, month)
    VALUES (user_uuid, 1, current_month)
    ON CONFLICT (user_id, month)
    DO UPDATE SET uploads_this_month = user_monthly_uploads.uploads_this_month + 1;
    
    -- Return the new count
    SELECT uploads_this_month INTO current_uploads
    FROM public.user_monthly_uploads
    WHERE user_id = user_uuid AND month = current_month;
    
    RETURN current_uploads;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;