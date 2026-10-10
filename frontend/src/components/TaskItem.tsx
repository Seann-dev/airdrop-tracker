import React from 'react';
import { CheckCircle, Circle, Repeat, Calendar, ExternalLink } from 'lucide-react';
import type { Task } from '../types';

interface TaskItemProps {
  task: Task;
  onToggle: (taskId: number, currentCompleted: boolean) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle }) => {
  return (
    <div className={`p-4 rounded-xl border transition flex items-center justify-between ${
      task.is_completed 
        ? 'bg-slate-900/40 border-slate-800/50 opacity-60' 
        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
    }`}>
      <div className="flex items-start space-x-3.5">
        <button
          onClick={() => onToggle(task.id, task.is_completed)}
          className="mt-0.5 text-slate-400 hover:text-purple-400 transition"
        >
          {task.is_completed ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>
        <div>
          <h4 className={`text-sm font-medium ${task.is_completed ? 'line-through text-slate-400' : 'text-slate-100'}`}>
            {task.title}
          </h4>
          {task.description && (
            <p className="text-xs text-slate-400 mt-1 max-w-lg">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {task.category}
            </span>

            {task.recurrence && task.recurrence !== 'None' && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 flex items-center space-x-1">
                <Repeat className="w-3 h-3 mr-1" />
                {task.recurrence}
              </span>
            )}

            {task.deadline && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 flex items-center space-x-1">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(task.deadline).toLocaleDateString()}
              </span>
            )}

            {task.source_url && (
              <a
                href={task.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center space-x-0.5"
              >
                <span>Source</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
