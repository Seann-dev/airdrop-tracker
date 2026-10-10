import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Project, Task, ProjectStatus } from '../types';
import { Calendar as CalendarIcon, CheckCircle2, CircleDashed } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'project' | 'task';
  status?: ProjectStatus;
  completed?: boolean;
  recurrence?: string;
}

export const CalendarPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projRes, tasksRes] = await Promise.all([
          api.get('/projects'),
          api.get('/tasks?completed=false'),
        ]);
        setProjects(projRes.data);
        setTasks(tasksRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, []);

  const events: CalendarEvent[] = [
    ...projects.filter(p => p.deadline).map(p => ({
      id: `proj-${p.id}`,
      title: p.name,
      date: new Date(p.deadline!),
      type: 'project' as const,
      status: p.status,
    })),
    ...tasks.filter(t => t.deadline).map(t => ({
      id: `task-${t.id}`,
      title: t.title,
      date: new Date(t.deadline!),
      type: 'task' as const,
      completed: t.is_completed,
      recurrence: t.recurrence,
    })),
  ];

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = endOfMonth.getDate();
  const startDay = startOfMonth.getDay();

  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), d));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push(week);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <CalendarIcon className="w-5 h-5 mr-2 text-purple-400" />
          Campaign Calendar
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1))}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl transition"
          >
            &larr;
          </button>
          <span className="text-sm font-medium text-white min-w-[160px] text-center">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1))}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl transition"
          >
            &rarr;
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-medium transition"
          >
            Today
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-7 p-2 border-b border-slate-800">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-xs font-semibold text-slate-400 text-center py-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="p-2">
          {weeks.map((w, wIdx) => (
            <div key={wIdx} className="grid grid-cols-7 gap-1">
              {w.map((day, dIdx) => {
                if (!day) return <div key={dIdx} className="h-24" />;
                
                const isToday = day.toDateString() === new Date().toDateString();
                const dayEvents = events.filter(e => e.date.toDateString() === day.toDateString());
                
                return (
                  <div
                    key={dIdx}
                    className={`relative min-h-[100px] p-2 rounded-lg border ${
                      isToday ? 'bg-purple-950/30 border-purple-800' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <span className={`text-sm font-medium ${isToday ? 'text-purple-400' : 'text-slate-200'}`}>
                      {day.getDate()}
                    </span>
                    <div className="mt-1 space-y-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map(e => (
                        <div
                          key={e.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1 ${
                            e.type === 'project' 
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : e.completed 
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {e.type === 'project' ? (
                            <CalendarIcon className="w-3 h-3" />
                          ) : (
                            e.completed ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <CircleDashed className="w-3 h-3" />
                            )
                          )}
                          <span>{e.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-slate-500 px-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
