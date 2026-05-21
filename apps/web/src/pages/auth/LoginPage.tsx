import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthErrorMessage } from '@educonnect/shared';
import { Button } from '../../components/ui/Button';
import { FormError } from '../../components/ui/FormError';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { loginSchema, type LoginFormData } from '../../lib/validation';
import { AuthShell } from './AuthShell';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  const onSubmit = async (data: LoginFormData) => {
    setFormError(null);
    try {
      await signIn(data.email, data.password);
      navigate('/', { replace: true });
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    }
  };

  return (
    <AuthShell
      title="Welcome Back"
      description="Sign in to access your EduConnect workspace."
      footer={
        <>
          New to EduConnect?{' '}
          <Link to="/auth/register" className="font-black text-blue-600 hover:text-blue-700">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left" noValidate>
        <div className="space-y-1">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="user@educonnect.app"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>
        <div className="space-y-1">
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              {...register('rememberMe')}
            />
            Remember me
          </label>
          <Link to="/auth/forgot-password" className="text-xs font-black text-blue-600">
            Forgot password?
          </Link>
        </div>
        <FormError message={formError || undefined} />
        <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
          Sign In
        </Button>
      </form>
    </AuthShell>
  );
}
