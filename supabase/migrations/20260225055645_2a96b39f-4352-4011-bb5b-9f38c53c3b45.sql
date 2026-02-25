
-- Add unique constraint on phone per user (a student with same phone should not be duplicated)
ALTER TABLE public.students ADD CONSTRAINT students_phone_user_unique UNIQUE (phone, user_id);

-- Also add unique constraint on course name per user
ALTER TABLE public.courses ADD CONSTRAINT courses_name_user_unique UNIQUE (name, user_id);
