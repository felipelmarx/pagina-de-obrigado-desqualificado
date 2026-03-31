"use client";

import { useEffect, useState } from "react";

function getNextTarget(): Date {
  const now = new Date();
  const target = new Date(now);

  // Próxima segunda-feira às 19h (horário de Brasília)
  const dayOfWeek = now.getDay();
  let daysUntilMonday = (1 - dayOfWeek + 7) % 7;
  if (daysUntilMonday === 0) {
    // Se hoje é segunda, verifica se já passou das 19h
    const brazilHour = now.getUTCHours() - 3;
    if (brazilHour >= 19) {
      daysUntilMonday = 7;
    }
  }

  target.setDate(now.getDate() + daysUntilMonday);
  target.setUTCHours(22, 0, 0, 0); // 19h BRT = 22h UTC

  return target;
}

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const target = getNextTarget();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target.getTime() - now;

      if (distance <= 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex gap-3 justify-center">
      <div className="countdown-cell">
        <div className="countdown-number">{pad(timeLeft.days)}</div>
        <div className="countdown-label">Dias</div>
      </div>
      <div className="countdown-cell">
        <div className="countdown-number">{pad(timeLeft.hours)}</div>
        <div className="countdown-label">Horas</div>
      </div>
      <div className="countdown-cell">
        <div className="countdown-number">{pad(timeLeft.minutes)}</div>
        <div className="countdown-label">Minutos</div>
      </div>
      <div className="countdown-cell">
        <div className="countdown-number">{pad(timeLeft.seconds)}</div>
        <div className="countdown-label">Segundos</div>
      </div>
    </div>
  );
}
