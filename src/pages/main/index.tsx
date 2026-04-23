"use client";
import type { AppProps } from 'next/app';
import Resizable from '@/components/main-ui/Resizable';
import { UserContext } from "@/UserContext"; // Import the UserContext
import { useContext } from 'react';
import useAuth from '@/utils/useAuth';

export default function Main() {
  // 1) Retrieve context & guard if it's null
  const userContextValue = useContext(UserContext);
  if (!userContextValue) {
    return <div>No UserContext available</div>;
  }

  // 2) Destructure from the guaranteed non-null context
  const { user } = userContextValue;
  
  const userAuth = useAuth();
  if (!userAuth) {
    // Optionally, you can return a loading spinner here
    return null;
  }

  return (
    <div>
      <Resizable />
    </div>
  );
}