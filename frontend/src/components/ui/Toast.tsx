import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ToastNotification } from '../../store/appStore';

export interface ToastProps {
  toast: ToastNotification;
  onClose: () => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'bg-success border-success-dark',
  error: 'bg-danger border-danger-dark',
  warning: 'bg-warning border-warning-dark',
  info: 'bg-primary border-primary-dark',
};

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const Icon = icons[toast.type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg',
        'min-w-[300px] max-w-[500px]',
        styles[toast.type],
        'animate-in slide-in-from-top-5 fade-in'
      )}
    >
      <Icon className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium text-white">{toast.title}</p>
        {toast.message && (
          <p className="mt-1 text-sm text-white/90">{toast.message}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-white/80 hover:text-white transition-colors flex-shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: ToastNotification[]; onRemove: (id: string) => void }> = ({
  toasts,
  onRemove,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => onRemove(toast.id)} />
      ))}
    </div>
  );
};

