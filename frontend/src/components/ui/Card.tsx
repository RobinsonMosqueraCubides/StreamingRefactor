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
  const baseStyles = 'bg-brand-secondary/60 backdrop-blur-xl border border-brand-border/80 rounded-2xl p-6 shadow-xl transition-all duration-200';
  const hoverStyles = hoverEffect 
    ? 'hover:scale-[1.01] hover:border-brand-accent/60 hover:shadow-brand-accent/5' 
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
