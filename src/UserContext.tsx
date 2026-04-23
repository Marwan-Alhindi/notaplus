"use server"
import React, { createContext, useState, useEffect, ReactNode } from "react";
import client from '@/utils/supabase/supabaseClient'; // Adjust the path as necessary


interface User {
  id: string;
  email?: string;
}

interface UserContextValue {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
}

export const UserContext = createContext<UserContextValue | null>(null);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user: currentUser } } = await client.auth.getUser();
      if (currentUser) {
        setUser({ id: currentUser.id, email: currentUser.email || undefined });
      }
      setLoading(false);
    })();

    const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || undefined });
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}