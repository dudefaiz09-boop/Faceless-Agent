import { AlertCircle } from 'lucide-react';

export interface FormErrorProps {
  message?: string;
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="ml-1 flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-300"
    >
      <AlertCircle size={13} />
      {message}
    </p>
  );
}
