import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'gradient';
  accent?: 'violet' | 'blue' | 'cyan' | 'emerald' | 'amber' | 'rose';
  hover?: boolean;
}

const variantStyles = {
  default: 'bg-white border border-slate-100 shadow-sm dark:bg-[#16162a] dark:border-[#1e1e3a]',
  glass: 'bg-white/80 border border-white/70 backdrop-blur-lg shadow-sm dark:bg-[#16162a]/80 dark:border-white/[0.06]',
  gradient: 'bg-gradient-to-br from-violet-50 via-white to-blue-50 border border-violet-100/50 dark:from-violet-950/30 dark:via-[#16162a] dark:to-blue-950/30 dark:border-violet-900/20',
};

const accentBorders: Record<string, string> = {
  violet: 'border-l-[3px] border-l-violet-500',
  blue: 'border-l-[3px] border-l-blue-500',
  cyan: 'border-l-[3px] border-l-cyan-500',
  emerald: 'border-l-[3px] border-l-emerald-500',
  amber: 'border-l-[3px] border-l-amber-500',
  rose: 'border-l-[3px] border-l-rose-500',
};

export const Card = ({ children, variant = 'default', accent, hover, className, ...props }: CardProps) => {
  const Comp = hover ? motion.div : 'div';
  const motionProps = hover
    ? {
        whileHover: { y: -3, scale: 1.005 },
        transition: { type: 'spring', stiffness: 300, damping: 24 },
      }
    : {};

  return (
    <Comp
      className={cn(
        'rounded-3xl overflow-hidden',
        variantStyles[variant],
        accent && accentBorders[accent],
        className
      )}
      {...motionProps}
      {...props}
    >
      {children}
    </Comp>
  );
};

export const CardHeader = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
  <div className={cn('p-6 pb-0', className)} {...props}>
    {children}
  </div>
);

export const CardContent = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
  <div className={cn('p-6', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
  <div className={cn('p-6 pt-0', className)} {...props}>
    {children}
  </div>
);
