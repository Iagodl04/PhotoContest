
import { useContest } from '@/hooks/useContest';
import { useEffect, useState } from 'react';

export function TopBar() {
  const { settings, isContestActive } = useContest();
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!settings) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const endTime = new Date(settings.end_at).getTime();
      const difference = endTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${minutes}m ${seconds}s`);
        }
      } else {
        setTimeLeft('Concurso finalizado');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [settings]);

  if (!settings) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 z-40">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">{settings.title}</h1>
          <p className="text-sm text-gray-600">{settings.subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">
            {isContestActive() ? 'Tiempo restante:' : ''}
          </p>
          <p className={`text-sm font-mono ${isContestActive() ? 'text-purple-600' : 'text-red-600'}`}>
            {timeLeft}
          </p>
        </div>
      </div>
    </div>
  );
}
