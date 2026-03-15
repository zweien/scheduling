import { checkAuth } from '@/lib/auth';
import { isRegistrationEnabled } from '@/lib/config';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/RegisterForm';

export default async function RegisterPage() {
  if (await checkAuth()) {
    redirect('/dashboard');
  }

  return <RegisterForm registrationEnabled={isRegistrationEnabled()} />;
}
