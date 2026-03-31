"use client";

import { useEffect, useState } from "react";

function getTarget(): Date {
  // 06/04/2026 às 19h BRT (22h UTC)
  return new Date(Date.UTC(2026, 3, 6, 22, 0, 0));
}

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const target = getTarget();

    const tick = () => {
      const now = Date.now();
      const distance = target.getTime() - now;

      if (distance <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor(
          (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        ),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  if (!mounted) {
    return (
      <div className="countdown-grid">
        {["Dias", "Horas", "Min", "Seg"].map((label) => (
          <div className="countdown-cell" key={label}>
            <div className="countdown-number">--</div>
            <div className="countdown-label">{label}</div>
          </div>
        ))}
      </div>
    );
  }

  const cells = [
    { value: timeLeft.days, label: "Dias" },
    { value: timeLeft.hours, label: "Horas" },
    { value: timeLeft.minutes, label: "Min" },
    { value: timeLeft.seconds, label: "Seg" },
  ];

  return (
    <div className="countdown-grid">
      {cells.map((cell, i) => (
        <div key={cell.label} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="countdown-cell">
            <div className="countdown-number">{pad(cell.value)}</div>
            <div className="countdown-label">{cell.label}</div>
          </div>
          {i < cells.length - 1 && (
            <div className="countdown-separator">
              <div className="countdown-separator-dot" />
              <div className="countdown-separator-dot" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
