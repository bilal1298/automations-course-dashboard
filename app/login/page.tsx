import LoginForm from './login-form';
export const metadata = { title: 'Sign in | Automation Academy' };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <LoginForm linkError={error === 'link'} />;
}
