'use client';

import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Flame,
  ArrowUp,
  Minus,
  ArrowDown,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import type { Task, TaskPriority, TaskStatus, Appointment, AppointmentStatus } from '@/lib/types';

interface ClientAgendaProps {
  clientId: string;
  tasks: Task[];
  appointments: Appointment[];
}

type ViewMode = 'month' | 'week';

// Type unifié pour les éléments du calendrier
type CalendarItem =
  | { type: 'task'; data: Task }
  | { type: 'appointment'; data: Appointment };

const priorityColors: Record<TaskPriority, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  normal: 'bg-blue-500',
  low: 'bg-gray-400',
};

const priorityIcons: Record<TaskPriority, typeof Flame> = {
  urgent: Flame,
  high: ArrowUp,
  normal: Minus,
  low: ArrowDown,
};

const statusStyles: Record<TaskStatus, string> = {
  pending: '',
  in_progress: 'ring-2 ring-blue-500',
  completed: 'opacity-50 line-through',
  cancelled: 'opacity-30 line-through',
};

const appointmentStatusStyles: Record<AppointmentStatus, string> = {
  pending: 'bg-purple-500',
  confirmed: 'bg-green-600',
  cancelled: 'opacity-30 line-through bg-purple-500',
};

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function ClientAgenda({ tasks, appointments }: ClientAgendaProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get tasks with due dates
  const tasksWithDates = useMemo(() => {
    return tasks.filter(task => task.due_date);
  }, [tasks]);

  // Get items for a specific date
  const getItemsForDate = (date: Date): CalendarItem[] => {
    const dateStr = date.toISOString().split('T')[0];

    const taskItems: CalendarItem[] = tasksWithDates
      .filter(task => task.due_date?.split('T')[0] === dateStr)
      .map(task => ({ type: 'task' as const, data: task }));

    const appointmentItems: CalendarItem[] = appointments
      .filter(apt => apt.date === dateStr)
      .map(apt => ({ type: 'appointment' as const, data: apt }));

    // Sort by time (appointments first with their time, then tasks)
    return [...appointmentItems, ...taskItems];
  };

  // Navigation
  const goToPrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const goToNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get calendar days for month view
  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Adjust for Monday start
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const days: (Date | null)[] = [];

    // Add empty days for the start
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Add month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  // Get week days
  const getWeekDays = () => {
    const days: Date[] = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      days.push(d);
    }

    return days;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatWeekRange = () => {
    const weekDays = getWeekDays();
    const start = weekDays[0];
    const end = weekDays[6];

    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${MONTHS[start.getMonth()]} - ${end.getDate()} ${MONTHS[end.getMonth()]} ${start.getFullYear()}`;
  };

  // Render a calendar item (task or appointment)
  const renderItem = (item: CalendarItem, compact: boolean = false) => {
    if (item.type === 'task') {
      const task = item.data;
      const PriorityIcon = priorityIcons[task.priority];
      return (
        <div
          key={`task-${task.id}`}
          className={cn(
            'text-xs px-1 py-0.5 rounded truncate flex items-center gap-1',
            priorityColors[task.priority],
            'text-white',
            statusStyles[task.status]
          )}
          title={task.name}
        >
          <PriorityIcon className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{task.name}</span>
        </div>
      );
    } else {
      const apt = item.data;
      return (
        <div
          key={`apt-${apt.id}`}
          className={cn(
            'text-xs px-1 py-0.5 rounded truncate flex items-center gap-1',
            appointmentStatusStyles[apt.status],
            'text-white'
          )}
          title={`${apt.start_time} - ${apt.event_type}`}
        >
          <Clock className="h-3 w-3 flex-shrink-0" />
          {!compact && <span className="font-medium">{apt.start_time.slice(0, 5)}</span>}
          <span className="truncate">{compact ? 'RDV' : apt.event_type}</span>
        </div>
      );
    }
  };

  // Render detailed item for week view
  const renderDetailedItem = (item: CalendarItem) => {
    if (item.type === 'task') {
      const task = item.data;
      const PriorityIcon = priorityIcons[task.priority];
      return (
        <div
          key={`task-${task.id}`}
          className={cn(
            'text-xs p-2 rounded',
            priorityColors[task.priority],
            'text-white',
            statusStyles[task.status]
          )}
        >
          <div className="flex items-center gap-1 font-medium">
            <PriorityIcon className="h-3 w-3" />
            <span className="truncate">{task.name}</span>
          </div>
          {task.location && (
            <div className="text-white/80 truncate mt-0.5">
              📍 {task.location}
            </div>
          )}
        </div>
      );
    } else {
      const apt = item.data;
      return (
        <div
          key={`apt-${apt.id}`}
          className={cn(
            'text-xs p-2 rounded',
            appointmentStatusStyles[apt.status],
            'text-white'
          )}
        >
          <div className="flex items-center gap-1 font-medium">
            <Clock className="h-3 w-3" />
            <span>{apt.start_time.slice(0, 5)} - {apt.end_time.slice(0, 5)}</span>
          </div>
          <div className="truncate mt-0.5 font-medium">
            {apt.event_type}
          </div>
          <div className="text-white/80 text-[10px] mt-0.5">
            {apt.status === 'pending' ? 'En attente' : apt.status === 'confirmed' ? 'Confirmé' : 'Annulé'}
          </div>
        </div>
      );
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">
              {viewMode === 'month'
                ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                : formatWeekRange()}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Aujourd&apos;hui
            </Button>

            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode('month')}
              >
                Mois
              </Button>
              <Button
                variant={viewMode === 'week' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode('week')}
              >
                Semaine
              </Button>
            </div>

            <div className="flex">
              <Button variant="ghost" size="icon" onClick={goToPrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="p-4">
        {viewMode === 'month' ? (
          // Month view
          <div>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {getMonthDays().map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="h-24" />;
                }

                const dayItems = getItemsForDate(date);
                const today = isToday(date);

                return (
                  <div
                    key={date.toISOString()}
                    className={cn(
                      'h-24 p-1 border rounded-lg overflow-hidden',
                      today ? 'border-primary bg-primary/5' : 'border-border',
                      'hover:border-primary/50 transition-colors'
                    )}
                  >
                    <div className={cn(
                      'text-sm font-medium mb-1',
                      today ? 'text-primary' : 'text-foreground'
                    )}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayItems.slice(0, 3).map((item) => renderItem(item, true))}
                      {dayItems.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayItems.length - 3} autre{dayItems.length - 3 > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Week view
          <div>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {getWeekDays().map((date, index) => {
                const today = isToday(date);
                return (
                  <div
                    key={date.toISOString()}
                    className={cn(
                      'text-center py-2 rounded-lg',
                      today && 'bg-primary text-primary-foreground'
                    )}
                  >
                    <div className="text-sm font-medium">{DAYS[index]}</div>
                    <div className="text-2xl font-semibold">{date.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* Items per day */}
            <div className="grid grid-cols-7 gap-2">
              {getWeekDays().map((date) => {
                const dayItems = getItemsForDate(date);

                return (
                  <div
                    key={date.toISOString()}
                    className="min-h-[200px] border border-border rounded-lg p-2 space-y-1"
                  >
                    {dayItems.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-4">
                        Aucun événement
                      </div>
                    ) : (
                      dayItems.map((item) => renderDetailedItem(item))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-border">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-muted-foreground">Légende :</span>

          {/* Appointments */}
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-purple-500" />
            <Clock className="h-3 w-3" />
            RDV en attente
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-600" />
            <Clock className="h-3 w-3" />
            RDV confirmé
          </span>

          <span className="text-muted-foreground">|</span>

          {/* Task priorities */}
          {Object.entries(priorityColors).map(([priority, color]) => {
            const Icon = priorityIcons[priority as TaskPriority];
            return (
              <span key={priority} className="flex items-center gap-1">
                <span className={cn('w-3 h-3 rounded', color)} />
                <Icon className="h-3 w-3" />
                {priority === 'urgent' && 'Urgent'}
                {priority === 'high' && 'Haute'}
                {priority === 'normal' && 'Normale'}
                {priority === 'low' && 'Basse'}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
