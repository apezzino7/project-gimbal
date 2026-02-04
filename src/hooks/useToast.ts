import { useContext } from 'react';
import { ToastContext } from '../contexts/ToastContext';

/**
 * Hook to access toast notifications
 *
 * @example
 * const toast = useToast();
 * toast.success('Login successful!');
 * toast.error('Something went wrong');
 * toast.warning('Session expiring soon');
 * toast.info('New features available');
 */
export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

export default useToast;
