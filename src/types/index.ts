export interface Course {
  id: string;
  name: string;
  type: string;
  date: string;
  time: string;
  location: string;
  totalSessions: number;
  completedSessions: number;
}

export interface Student {
  id: string;
  name: string;
  phone: string;
  email: string;
  courseId: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  courseId: string;
}

export interface ReminderSetting {
  id: string;
  courseId: string;
  daysBefore: number;
  hoursBefore: number;
  templateId: string;
  enabled: boolean;
}
