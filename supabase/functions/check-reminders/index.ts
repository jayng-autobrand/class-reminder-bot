import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PERISKOPE_API_URL = "https://api.periskope.app/v1";
const ORG_PHONE = "85267610707";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PERISKOPE_API_KEY = Deno.env.get('PERISKOPE_API_KEY');
    if (!PERISKOPE_API_KEY) throw new Error('PERISKOPE_API_KEY is not configured');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase config missing');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all enabled reminder settings with their course and template info
    const { data: reminders, error: remErr } = await supabase
      .from('reminder_settings')
      .select('*, courses(*), message_templates(*)')
      .eq('enabled', true);

    if (remErr) throw new Error(`Failed to fetch reminders: ${remErr.message}`);
    if (!reminders || reminders.length === 0) {
      console.log('No active reminders found');
      return new Response(JSON.stringify({ success: true, message: 'No active reminders' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    let totalSent = 0;

    for (const reminder of reminders) {
      const course = reminder.courses;
      const template = reminder.message_templates;
      if (!course || !template) continue;

      // Calculate when the reminder should fire
      const courseDateTime = new Date(`${course.date}T${course.time}`);
      const reminderTime = new Date(courseDateTime);
      reminderTime.setDate(reminderTime.getDate() - reminder.days_before);
      reminderTime.setHours(reminderTime.getHours() - reminder.hours_before);

      // Check if we should send now (within a 10-minute window)
      const diffMs = reminderTime.getTime() - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      // Send if reminder time is within -5 to +5 minutes of now
      if (diffMinutes < -5 || diffMinutes > 5) {
        console.log(`Skipping reminder for ${course.name}: not within window (diff: ${diffMinutes.toFixed(1)} min)`);
        continue;
      }

      // Check if we already sent this reminder (avoid duplicates)
      const windowStart = new Date(now.getTime() - 10 * 60 * 1000);
      const { data: existing } = await supabase
        .from('sent_messages')
        .select('id')
        .eq('course_id', course.id)
        .gte('sent_at', windowStart.toISOString())
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`Already sent reminder for ${course.name} in this window`);
        continue;
      }

      // Get students for this course
      const { data: students, error: stuErr } = await supabase
        .from('students')
        .select('*')
        .eq('course_id', course.id);

      if (stuErr || !students) {
        console.error(`Failed to fetch students for ${course.name}:`, stuErr);
        continue;
      }

      console.log(`Sending reminders for ${course.name} to ${students.length} students`);

      for (const student of students) {
        const message = template.content
          .replace(/\{\{學生名\}\}/g, student.name)
          .replace(/\{\{課程名\}\}/g, course.name)
          .replace(/\{\{日期\}\}/g, course.date)
          .replace(/\{\{時間\}\}/g, course.time)
          .replace(/\{\{地點\}\}/g, course.location || '');

        const chatId = student.phone.includes('@') ? student.phone : `${student.phone}@c.us`;

        try {
          const response = await fetch(`${PERISKOPE_API_URL}/message/send`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${PERISKOPE_API_KEY}`,
              'Content-Type': 'application/json',
              'x-phone': ORG_PHONE,
            },
            body: JSON.stringify({ chat_id: chatId, message }),
          });

          const data = await response.json();

          await supabase.from('sent_messages').insert({
            student_id: student.id,
            student_name: student.name,
            student_phone: student.phone,
            course_id: course.id,
            course_name: course.name,
            message_content: message,
            status: response.ok ? 'queued' : 'failed',
            queue_id: data.queue_id || null,
            error_message: response.ok ? null : JSON.stringify(data),
          });

          if (response.ok) totalSent++;
          else console.error(`Failed to send to ${student.name}:`, data);
        } catch (err) {
          console.error(`Error sending to ${student.name}:`, err);
          await supabase.from('sent_messages').insert({
            student_id: student.id,
            student_name: student.name,
            student_phone: student.phone,
            course_id: course.id,
            course_name: course.name,
            message_content: message,
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }

    console.log(`Cron complete. Total messages sent: ${totalSent}`);
    return new Response(
      JSON.stringify({ success: true, totalSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Cron error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
