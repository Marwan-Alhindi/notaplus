// useAuth.ts
"use server";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import client from '@/utils/supabase/supabaseClient'; // Use the centralized Supabase client
import type { User } from '@supabase/supabase-js'; // <-- Import User type

const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: session, error } = await client.auth.getSession();

      if (error || !session?.session) {
        console.warn('No session found or error occurred:', error);
        router.push('/'); // Redirect if no session
        return;
      }

      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError) {
        console.error('Error fetching user:', userError);
        router.push('/');
        return;
      }

      setUser(userData.user);
      setIsLoading(false);
    };

    checkUser();
  }, [router]);

  return { user, isLoading };
};

export default useAuth;