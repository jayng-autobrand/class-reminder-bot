import type { Course, Student, MessageTemplate, ReminderSetting } from "@/types";
import { formatDateDDMMYYYY } from "@/lib/dateFormat";
import { getNextSessionDate } from "@/lib/courseSchedule";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, MessageSquare, Bell, Send } from "lucide-react";

interface Props {
  courses: Course[];
  students: Student[];
  templates: MessageTemplate[];
  reminders: ReminderSetting[];
}

export default function DashboardOverview({ courses, students, templates, reminders }: Props) {
  const activeReminders = reminders.filter((r) => r.enabled).length;

  const stats = [
    { label: "課程數量", value: courses.length, icon: BookOpen, color: "text-primary" },
    { label: "學員人數", value: students.length, icon: Users, color: "text-info" },
    { label: "訊息模板", value: templates.length, icon: MessageSquare, color: "text-warning" },
    { label: "啟用提醒", value: activeReminders, icon: Bell, color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">總覽</h2>
        <p className="text-muted-foreground mt-1">系統狀態一覽</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(() => {
        const now = new Date();
        const upcoming = courses
          .filter((c) => {
            if (c.recurringDays && c.totalSessions > 1) {
              return c.completedSessions < c.totalSessions;
            }
            const endTime = c.timeEnd || c.time || "00:00:00";
            const courseEnd = new Date(`${c.date}T${endTime}+08:00`);
            return !Number.isNaN(courseEnd.getTime()) && courseEnd >= now;
          })
          .map((c) => {
            const nextDate = c.recurringDays ? getNextSessionDate(c) : c.date;
            return { ...c, _nextDate: nextDate || c.date };
          })
          .sort((a, b) => {
            const aDate = new Date(`${a._nextDate}T${a.time || "00:00:00"}+08:00`).getTime();
            const bDate = new Date(`${b._nextDate}T${b.time || "00:00:00"}+08:00`).getTime();
            return aDate - bDate;
          });
        return upcoming.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">即將上課</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcoming.slice(0, 5).map((course) => {
                const studentCount = students.filter((s) => s.courseId === course.id).length;
                return (
                  <div key={course.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-foreground">{course.name}</p>
                      <p className="text-sm text-muted-foreground">{formatDateDDMMYYYY((course as any)._nextDate)} · {course.time}{course.timeEnd ? `–${course.timeEnd}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {studentCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Send className="w-4 h-4" />
                        待發送
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        ) : null;
      })()}
    </div>
  );
}
