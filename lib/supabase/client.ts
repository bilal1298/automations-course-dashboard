import { createBrowserClient } from '@supabase/ssr';
import { supabaseUrl, supabaseKey } from './env';
export const createClient = () => createBrowserClient(supabaseUrl, supabaseKey);
