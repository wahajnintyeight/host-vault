import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, header, footer, padding = 'md', children, ...props }, ref) => {
    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-background-light rounded-xl shadow-lg transition-all duration-200',
          'hover:shadow-xl hover:scale-[1.01]',
          className
        )}
        {...props}
      >
        {header && (
          <div className={cn(paddingClasses[padding], 'pb-4')}>
            {header}
          </div>
        )}
        <div className={cn(paddingClasses[padding])}>{children}</div>
        {footer && (
          <div className={cn(paddingClasses[padding], 'pt-4')}>
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';

