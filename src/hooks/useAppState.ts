import { useState } from "react";
import type { Course, Student, MessageTemplate, ReminderSetting } from "@/types";

const SAMPLE_COURSES: Course[] = [
  { id: "1", name: "基礎班 A", type: "基礎", date: "2026-03-01", time: "10:00", location: "Room 101" },
  { id: "2", name: "進階班 B", type: "進階", date: "2026-03-03", time: "14:00", location: "https://zoom.us/j/123456" },
];

const SAMPLE_STUDENTS: Student[] = [
  { id: "1", name: "陳大文", phone: "85291234567", email: "chan@example.com", courseId: "1" },
  { id: "2", name: "李小明", phone: "85298765432", email: "lee@example.com", courseId: "1" },
  { id: "3", name: "王美玲", phone: "85296543210", email: "wong@example.com", courseId: "2" },
];

const SAMPLE_TEMPLATES: MessageTemplate[] = [
  {
    id: "1",
    name: "標準上堂提示",
    content: "你好 {{學生名}}，提醒你 {{日期}} {{時間}} 有 {{課程名}} 😊\n地點：{{地點}}\n如有問題請回覆此訊息 🙏",
    courseId: "",
  },
];

const SAMPLE_REMINDERS: ReminderSetting[] = [
  { id: "1", courseId: "1", daysBefore: 1, hoursBefore: 0, templateId: "1", enabled: true },
];

export function useAppState() {
  const [courses, setCourses] = useState<Course[]>(SAMPLE_COURSES);
  const [students, setStudents] = useState<Student[]>(SAMPLE_STUDENTS);
  const [templates, setTemplates] = useState<MessageTemplate[]>(SAMPLE_TEMPLATES);
  const [reminders, setReminders] = useState<ReminderSetting[]>(SAMPLE_REMINDERS);

  const addCourse = (course: Omit<Course, "id">) => {
    setCourses((prev) => [...prev, { ...course, id: crypto.randomUUID() }]);
  };
  const updateCourse = (id: string, data: Partial<Course>) => {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  };
  const deleteCourse = (id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    setStudents((prev) => prev.filter((s) => s.courseId !== id));
    setReminders((prev) => prev.filter((r) => r.courseId !== id));
  };

  const addStudent = (student: Omit<Student, "id">) => {
    setStudents((prev) => [...prev, { ...student, id: crypto.randomUUID() }]);
  };
  const updateStudent = (id: string, data: Partial<Student>) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
  };
  const deleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const addTemplate = (template: Omit<MessageTemplate, "id">) => {
    setTemplates((prev) => [...prev, { ...template, id: crypto.randomUUID() }]);
  };
  const updateTemplate = (id: string, data: Partial<MessageTemplate>) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
  };
  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const addReminder = (reminder: Omit<ReminderSetting, "id">) => {
    setReminders((prev) => [...prev, { ...reminder, id: crypto.randomUUID() }]);
  };
  const updateReminder = (id: string, data: Partial<ReminderSetting>) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
  };
  const deleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  return {
    courses, addCourse, updateCourse, deleteCourse,
    students, addStudent, updateStudent, deleteStudent,
    templates, addTemplate, updateTemplate, deleteTemplate,
    reminders, addReminder, updateReminder, deleteReminder,
  };
}
