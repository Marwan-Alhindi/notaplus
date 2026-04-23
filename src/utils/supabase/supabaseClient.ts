"use server";
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// console.log("SUPABASE_URL: ", SUPABASE_URL);
// console.log("SUPABASE_ANON_KEY: ", SUPABASE_ANON_KEY);
// if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
//   console.error("Supabase URL and Anon Key must be provided.");
//   throw new Error("Supabase credentials are missing!");
// }

const client: SupabaseClient = createClient('https://fxtmwtmgizficzbccedk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4dG13dG1naXpmaWN6YmNjZWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5MDM1NTUsImV4cCI6MjA0NzQ3OTU1NX0.p1Bwh7r60kol9trkj78Swl9pc8Wx_XuqRoPJujTgiac');


export default client;