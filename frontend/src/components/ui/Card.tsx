import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export default function Card({
  children,
  className = '',
  hoverEffect = false,
  ...props
}: CardProps) {
  const baseStyles = 'bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl transition-all duration-300';
  const hoverStyles = hoverEffect 
    ? 'hover:scale-[1.01] hover:border-slate-700/60 hover:shadow-cyan-500/5' 
    : '';

  return (
    <div
      className={`${baseStyles} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
