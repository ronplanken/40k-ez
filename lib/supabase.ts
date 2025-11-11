/**
 * Supabase client setup - Placeholder for future integration
 *
 * To integrate Supabase:
 * 1. Install @supabase/supabase-js: npm install @supabase/supabase-js
 * 2. Create a .env.local file with your Supabase credentials:
 *    NEXT_PUBLIC_SUPABASE_URL=your-project-url
 *    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
 * 3. Uncomment and configure the code below
 * 4. Create tables for army lists in your Supabase project
 */

// import { createClient } from '@supabase/supabase-js'

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Example table schema for army lists:
 *
 * create table army_lists (
 *   id uuid default gen_random_uuid() primary key,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
 *   user_id uuid references auth.users,
 *   title text,
 *   raw_text text not null,
 *   formatted_output text,
 *   share_id text unique,
 *   is_public boolean default false
 * );
 */

export type ArmyListRecord = {
  id: string;
  created_at: string;
  user_id?: string;
  title?: string;
  raw_text: string;
  formatted_output?: string;
  share_id?: string;
  is_public: boolean;
};

// Placeholder functions for future implementation
export async function saveArmyList(data: Omit<ArmyListRecord, 'id' | 'created_at'>) {
  console.log('Supabase not configured. Would save:', data);
  throw new Error('Supabase integration not yet configured');
}

export async function getArmyList(id: string) {
  console.log('Supabase not configured. Would fetch:', id);
  throw new Error('Supabase integration not yet configured');
}

export async function getPublicArmyLists() {
  console.log('Supabase not configured. Would fetch public lists');
  throw new Error('Supabase integration not yet configured');
}
