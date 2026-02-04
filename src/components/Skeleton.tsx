import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Skeleton loading placeholder component
 * Used to show content placeholders while data is loading
 */
export function Skeleton({
  width,
  height,
  className = '',
  variant = 'rectangular',
  animation = 'pulse',
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-[shimmer_1.5s_ease-in-out_infinite]',
    none: '',
  };

  const style: CSSProperties = {
    width: width ?? '100%',
    height: height ?? (variant === 'text' ? '1em' : '100%'),
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      aria-hidden="true"
      role="presentation"
    />
  );
}

/**
 * Form skeleton for login/auth pages
 */
export function FormSkeleton() {
  return (
    <div className="w-full max-w-sm p-5 bg-white rounded shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
      {/* Title */}
      <div className="flex justify-center mb-4">
        <Skeleton width={150} height={24} />
      </div>

      {/* Email field */}
      <div className="mb-3">
        <Skeleton width={40} height={12} className="mb-1.5" />
        <Skeleton height={36} />
      </div>

      {/* Password field */}
      <div className="mb-3">
        <Skeleton width={60} height={12} className="mb-1.5" />
        <Skeleton height={36} />
      </div>

      {/* Remember me */}
      <div className="mb-4 flex items-center gap-2">
        <Skeleton width={14} height={14} variant="rectangular" />
        <Skeleton width={140} height={12} />
      </div>

      {/* Button */}
      <Skeleton height={36} />
    </div>
  );
}

/**
 * Dashboard skeleton
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Navbar */}
      <div className="bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-12">
            <Skeleton width={100} height={14} />
            <Skeleton width={60} height={32} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="bg-white rounded shadow-[0_2px_8px_rgba(0,0,0,0.1)] p-4">
          <Skeleton width={120} height={20} className="mb-2" />
          <Skeleton width={200} height={14} />
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
