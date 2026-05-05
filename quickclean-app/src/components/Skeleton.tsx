import { motion } from 'framer-motion';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export default function Skeleton({ width, height, borderRadius = '12px', className }: SkeletonProps) {
  return (
    <div 
      className={`skeleton-base ${className}`}
      style={{ width, height, borderRadius }}
    >
      <motion.div
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
        className="skeleton-shimmer"
      />
    </div>
  );
}
