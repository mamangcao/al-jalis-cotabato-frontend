import React, { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  message: string;
  className?: string;
}

export default function EmptyState({ icon, title, message, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center h-full ${className}`}>
      <div className="bg-gray-50 p-4 rounded-full mb-4 text-gray-400 shrink-0">
        {icon}
      </div>
      <h3 className="text-gray-900 font-medium">{title}</h3>
      <p className="text-gray-500 text-sm mt-1">{message}</p>
    </div>
  );
}
