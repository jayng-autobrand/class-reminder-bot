
-- Create sync_settings table to store Google Sheet sync configuration
CREATE TABLE public.sync_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sheet_url TEXT NOT NULL DEFAULT '',
  client_id TEXT NOT NULL DEFAULT '',
  client_secret TEXT NOT NULL DEFAULT '',
  refresh_token TEXT NOT NULL DEFAULT '',
  access_token TEXT NOT NULL DEFAULT '',
  expires_at BIGINT NOT NULL DEFAULT 0,
  sync_enabled BOOLEAN NOT NULL DEFAULT false,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.sync_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sync settings
CREATE POLICY "Users can view their own sync settings"
  ON public.sync_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync settings"
  ON public.sync_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync settings"
  ON public.sync_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role needs to read all for cron sync
CREATE POLICY "Service role can read all sync settings"
  ON public.sync_settings FOR SELECT
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_sync_settings_updated_at
  BEFORE UPDATE ON public.sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
