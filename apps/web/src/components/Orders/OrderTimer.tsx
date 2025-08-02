"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";

interface OrderTimerProps {
  expiresAt: Date;
  onExpire?: () => void;
  size?: "small" | "large";
}

export default function OrderTimer({
  expiresAt,
  onExpire,
  size = "small",
}: OrderTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  }>({ hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiryTime = new Date(expiresAt).getTime();
      const difference = expiryTime - now;

      if (difference <= 0) {
        setIsExpired(true);
        onExpire?.();
        return { hours: 0, minutes: 0, seconds: 0 };
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return { hours, minutes, seconds };
    };

    // Update time immediately
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  if (isExpired) {
    if (size === "large") {
      return (
        <div className="flex items-center justify-center space-x-3">
          <div className="h-4 w-4 rounded-full bg-red-500"></div>
          <span className="text-2xl font-bold text-red-600">EXPIRED</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-1">
        <div className="h-2 w-2 rounded-full bg-red-500"></div>
        <span className="text-xs font-medium text-red-600">Expired</span>
      </div>
    );
  }

  const isUrgent = timeLeft.hours === 0 && timeLeft.minutes < 10;

  if (size === "large") {
    return (
      <motion.div
        className={`flex items-center justify-center space-x-4 rounded-xl px-6 py-4 ${
          isUrgent ? "bg-red-50" : "bg-gray-50"
        }`}
        animate={isUrgent ? { scale: [1, 1.02, 1] } : {}}
        transition={isUrgent ? { duration: 2, repeat: Infinity } : {}}
      >
        <div
          className={`h-4 w-4 rounded-full ${isUrgent ? "bg-red-500" : "bg-green-500"}`}
        ></div>
        <span
          className={`text-2xl font-bold ${isUrgent ? "text-red-600" : "text-gray-600"}`}
        >
          {timeLeft.hours > 0 && `${timeLeft.hours}h `}
          {timeLeft.minutes > 0 && `${timeLeft.minutes}m `}
          {timeLeft.seconds}s
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`flex items-center space-x-2 rounded-lg px-2 py-1 ${
        isUrgent ? "bg-red-50" : "bg-gray-50"
      }`}
      animate={isUrgent ? { scale: [1, 1.02, 1] } : {}}
      transition={isUrgent ? { duration: 2, repeat: Infinity } : {}}
    >
      <div
        className={`h-2 w-2 rounded-full ${isUrgent ? "bg-red-500" : "bg-green-500"}`}
      ></div>
      <span
        className={`text-xs font-medium ${isUrgent ? "text-red-600" : "text-gray-600"}`}
      >
        {timeLeft.hours > 0 && `${timeLeft.hours}h `}
        {timeLeft.minutes > 0 && `${timeLeft.minutes}m `}
        {timeLeft.seconds}s
      </span>
    </motion.div>
  );
}
