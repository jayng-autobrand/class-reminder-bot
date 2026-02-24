import { useState, useEffect, useCallback } from "react";
import type { Course, Student, MessageTemplate, ReminderSetting } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { countCompletedSessions } from "@/lib/courseSchedule";

export function useAppState() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [reminders, setReminders] = useState<ReminderSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes, tRes, rRes] = await Promise.all([
        supabase.from('courses').select('*').order('date'),
        supabase.from('students').select('*').order('name'),
        supabase.from('message_templates').select('*').order('name'),
        supabase.from('reminder_settings').select('*'),
      ]);

      if (cRes.data) {
        const mapped = cRes.data.map((c: any) => ({
          id: c.id, name: c.name, type: c.type || '', date: c.date, time: c.time, timeEnd: c.time_end || '', location: c.location || '', totalSessions: c.total_sessions ?? 1, completedSessions: c.completed_sessions ?? 0, recurringDays: c.recurring_days || '',
        }));
        setCourses(mapped);

        // Auto-update completed sessions on load
        for (const course of mapped) {
          if (course.totalSessions > 1) {
            const autoCompleted = countCompletedSessions(course);
            if (autoCompleted !== course.completedSessions) {
              await supabase.from('courses').update({ completed_sessions: autoCompleted }).eq('id', course.id);
              course.completedSessions = autoCompleted;
            }
          }
        }
        setCourses([...mapped]);
      }
      if (sRes.data) setStudents(sRes.data.map((s: any) => ({
        id: s.id, name: s.name, phone: s.phone, email: s.email || '', courseId: s.course_id,
      })));
      if (tRes.data) setTemplates(tRes.data.map((t: any) => ({
        id: t.id, name: t.name, content: t.content, courseId: t.course_id || '',
      })));
      if (rRes.data) setReminders(rRes.data.map((r: any) => ({
        id: r.id, courseId: r.course_id, daysBefore: r.days_before, hoursBefore: r.hours_before,
        templateId: r.template_id, enabled: r.enabled,
      })));
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast({ title: "載入失敗", description: "無法從資料庫載入資料", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // --- Courses ---
  const addCourse = async (course: Omit<Course, "id">) => {
    const { data, error } = await supabase.from('courses').insert({
      name: course.name, type: course.type, date: course.date, time: course.time, time_end: course.timeEnd || '00:00:00', location: course.location, total_sessions: course.totalSessions ?? 1, completed_sessions: course.completedSessions ?? 0, recurring_days: course.recurringDays || '',
    }).select().single();
    if (error) { toast({ title: "錯誤", description: error.message, variant: "destructive" }); return; }
    setCourses(prev => [...prev, { id: data.id, name: data.name, type: data.type, date: data.date, time: data.time, timeEnd: data.time_end || '', location: data.location, totalSessions: data.total_sessions ?? 1, completedSessions: data.completed_sessions ?? 0, recurringDays: data.recurring_days || '' }]);
  };

  const updateCourse = async (id: string, updates: Partial<Course>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.time !== undefined) dbUpdates.time = updates.time;
    if (updates.timeEnd !== undefined) dbUpdates.time_end = updates.timeEnd;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.totalSessions !== undefined) dbUpdates.total_sessions = updates.totalSessions;
    if (updates.completedSessions !== undefined) dbUpdates.completed_sessions = updates.completedSessions;
    if (updates.recurringDays !== undefined) dbUpdates.recurring_days = updates.recurringDays;
    const { error } = await supabase.from('courses').update(dbUpdates).eq('id', id);
    if (error) { toast({ title: "錯誤", description: error.message, variant: "destructive" }); return; }
    setCourses(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCourse = async (id: string) => {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) { toast({ title: "錯誤", description: error.message, variant: "destructive" }); return; }
    setCourses(prev => prev.filter(c => c.id !== id));
    setStudents(prev => prev.filter(s => s.courseId !== id));
    setReminders(prev => prev.filter(r => r.courseId !== id));
  };

  // --- Students ---
  const addStudent = async (student: Omit<Student, "id">) => {
    const { data, error } = await supabase.from('students').insert({
      name: student.name, phone: student.phone, email: student.email, course_id: student.courseId,
    }).select().single();
    if (error) { toast({ title: "錯誤", description: error.message, variant: "destructive" }); return; }
    setStudents(prev => [...prev, { id: data.id, name: data.name, phone: data.phone, email: data.email || '', courseId: data.course_id }]);
  };

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.courseId !== undefined) dbUpdates.course_id = updates.courseId;
    const { error } = await supabase.from('students').update(dbUpdates).eq('id', id);
    if (error) { toast({ title: "錯誤", description: error.message, variant: "destructive" }); return; }
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteStudent = async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) { toast({ title: "錯誤", description: error.message, variant: "destructive" }); return; }
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  // --- Templates ---
  const addTemplate = async (template: Omit<MessageTemplate, "id">) => {
    const { data, error } = await supabase.from('message_templates').insert({
      name: template.name, content: template.content, course_id: template.courseId || null,
    }).select().single();
    if (error) { toast({ title: "錯誤", description: error.message, variant: "destructive" }); return; }
    setTemplates(prev => [...prev, { id: data.id, name: data.name, content: data.content, courseId: data.course_id || '' }]);
  };

  const updateTemplate = async (id: string, updates: Partial<MessageTemplate>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.courseId !== undefined) dbUpdates.course_id = updates.courseId || null;
    const { error } = await supabase.from('message_templates').update(dbUpdates).eq('id', id);
    if (error) { toast({ title: "錯誤", description: error.message, variant: "destructive" }); return; }
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from('message_templates').delete().eq('id', id);
    if (error) { toast({ title: "錯誤", description: error.message, variant: "destructive" }); return; }
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  // --- Reminders ---
  const addReminder = async (reminder: Omit<ReminderSetting, "id">) => {
    const { data, error } = await supabase.from('reminder_settings').insert({
      course_id: reminder.courseId, days_before: reminder.daysBefore, hours_before: reminder.hoursBefore,
      template_id: reminder.templateId, enabled: reminder.enabled,
    }).select().single();
    if (error) { toast({ title: "錯誤", description: error.message, variant: "destructive" }); return; }
    setReminders(prev => [...prev, {
      id: data.id, courseId: data.course_id, daysBefore: data.days_before,
      hoursBefore: data.hours_before, templateId: data.template_id, enabled: data.enabled,
    }]);
  };

  const updateReminder = async (id: string, updates: Partial<ReminderSetting>) => {
    const dbUpdates: any = {};
    if (updates.courseId !== undefined) dbUpdates.course_id = updates.courseId;
    if (updates.daysBefore !== undefined) dbUpdates.days_before = updates.daysBefore;
    if (updates.hoursBefore !== undefined) dbUpdates.hours_before = updates.hoursBefore;
    if (updates.templateId !== undefined) dbUpdates.template_id = updates.templateId;
    if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
    const { error } = await supabase.from('reminder_settings').update(dbUpdates).eq('id', id);
    if (error) { toast({ title: "錯誤", description: error.message, variant: "destructive" }); return; }
    setReminders(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteReminder = async (id: string) => {
    const { error } = await supabase.from('reminder_settings').delete().eq('id', id);
    if (error) { toast({ title: "錯誤", description: error.message, variant: "destructive" }); return; }
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  return {
    courses, addCourse, updateCourse, deleteCourse,
    students, addStudent, updateStudent, deleteStudent,
    templates, addTemplate, updateTemplate, deleteTemplate,
    reminders, addReminder, updateReminder, deleteReminder,
    loading, refresh: fetchAll,
  };
}
