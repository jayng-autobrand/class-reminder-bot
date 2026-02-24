-- Add end time for courses (e.g., 14:00 to 16:00)
ALTER TABLE public.courses 
ADD COLUMN time_end time without time zone NOT NULL DEFAULT '00:00:00';

-- Add recurring days (comma-separated weekday numbers: 0=Sun,1=Mon,...6=Sat; empty = single session)
ALTER TABLE public.courses 
ADD COLUMN recurring_days text NOT NULL DEFAULT '';