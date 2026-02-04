import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

const typeStyles: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: '✓',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-[#d32f2f]',
    icon: '✕',
  },
  warning: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    icon: '⚠',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-[#0353a4]',
    icon: 'ℹ',
  },
};

/**
 * Individual Toast notification component
 */
export function Toast({ id, message, type, duration = 5000, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const styles = typeStyles[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        onClose(id);
      }, 300); // Match animation duration

      return () => clearTimeout(timer);
    }
  }, [isExiting, id, onClose]);

  const handleClose = () => {
    setIsExiting(true);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        flex items-center gap-2 p-3 rounded border shadow-lg min-w-[280px] max-w-[400px]
        ${styles.bg} ${styles.border} ${styles.text}
        ${isExiting ? 'animate-[slideOut_0.3s_ease-in_forwards]' : 'animate-[slideIn_0.3s_ease-out]'}
      `}
    >
      <span className="text-base flex-shrink-0" aria-hidden="true">
        {styles.icon}
      </span>
      <p className="text-sm flex-1">{message}</p>
      <button
        onClick={handleClose}
        aria-label="Dismiss notification"
        className={`
          flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors
          ${styles.text}
        `}
      >
        <span aria-hidden="true" className="text-xs">✕</span>
      </button>
    </div>
  );
}

export interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
  }>;
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const positionStyles: Record<string, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

/**
 * Container for displaying multiple toasts
 */
export function ToastContainer({ toasts, onClose, position = 'top-right' }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className={`fixed z-50 flex flex-col gap-2 ${positionStyles[position]}`}
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={onClose}
        />
      ))}
    </div>
  );
}

export default Toast;
