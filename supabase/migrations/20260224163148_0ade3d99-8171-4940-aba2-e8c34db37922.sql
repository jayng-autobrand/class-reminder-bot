-- Add total_sessions column to courses table
ALTER TABLE public.courses 
ADD COLUMN total_sessions integer NOT NULL DEFAULT 1;

-- Add archived column for manual archive override (optional future use)
-- For now we determine archive status by date+time