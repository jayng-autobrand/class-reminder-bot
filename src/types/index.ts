export interface Course {
  id: string;
  name: string;
  type: string;
  date: string; // start date (ISO yyyy-mm-dd)
  time: string; // start time
  timeEnd: string; // end time
  location: string;
  totalSessions: number;
  completedSessions: number;
  recurringDays: string; // comma-separated weekday numbers: 0=Sun,1=Mon,...6=Sat; empty = single
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
