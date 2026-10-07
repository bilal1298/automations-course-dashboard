import { redirect } from 'next/navigation';
import Academy from '@/components/academy';
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return <Academy email={user.email ?? ''} />;
}
