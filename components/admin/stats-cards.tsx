import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface StatsCardsProps {
  stats: {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total des RDV',
      value: stats.total,
      icon: Calendar,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      title: 'En attente',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-600 bg-yellow-100',
    },
    {
      title: 'Confirmés',
      value: stats.confirmed,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100',
    },
    {
      title: 'Annulés',
      value: stats.cancelled,
      icon: XCircle,
      color: 'text-red-600 bg-red-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-background rounded-xl border border-border p-6"
        >
          <div className="flex items-center gap-4">
            <div className={cn('p-3 rounded-lg', card.color)}>
              <card.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <p className="text-2xl font-semibold text-foreground">
                {card.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
