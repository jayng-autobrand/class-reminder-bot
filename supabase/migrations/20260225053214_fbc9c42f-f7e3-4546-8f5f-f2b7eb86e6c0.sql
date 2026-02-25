
-- Add user_id to all shared tables
ALTER TABLE public.courses ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.students ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.message_templates ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.reminder_settings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.sent_messages ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Allow all access to courses" ON public.courses;
DROP POLICY IF EXISTS "Allow all access to students" ON public.students;
DROP POLICY IF EXISTS "Allow all access to message_templates" ON public.message_templates;
DROP POLICY IF EXISTS "Allow all access to reminder_settings" ON public.reminder_settings;
DROP POLICY IF EXISTS "Allow all access to sent_messages" ON public.sent_messages;

-- Courses RLS
CREATE POLICY "Users can view own courses" ON public.courses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own courses" ON public.courses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own courses" ON public.courses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own courses" ON public.courses FOR DELETE USING (auth.uid() = user_id);

-- Students RLS
CREATE POLICY "Users can view own students" ON public.students FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own students" ON public.students FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own students" ON public.students FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own students" ON public.students FOR DELETE USING (auth.uid() = user_id);

-- Message templates RLS
CREATE POLICY "Users can view own templates" ON public.message_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own templates" ON public.message_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON public.message_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON public.message_templates FOR DELETE USING (auth.uid() = user_id);

-- Reminder settings RLS
CREATE POLICY "Users can view own reminders" ON public.reminder_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminders" ON public.reminder_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminders" ON public.reminder_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reminders" ON public.reminder_settings FOR DELETE USING (auth.uid() = user_id);

-- Sent messages RLS
CREATE POLICY "Users can view own sent_messages" ON public.sent_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sent_messages" ON public.sent_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sent_messages" ON public.sent_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sent_messages" ON public.sent_messages FOR DELETE USING (auth.uid() = user_id);
