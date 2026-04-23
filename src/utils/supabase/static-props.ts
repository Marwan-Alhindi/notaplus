"use server"
import { createClient as createClientPrimitive } from '@supabase/supabase-js'

export function createClient() {
  const supabase = createClientPrimitive(
    'https://fxtmwtmgizficzbccedk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4dG13dG1naXpmaWN6YmNjZWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5MDM1NTUsImV4cCI6MjA0NzQ3OTU1NX0.p1Bwh7r60kol9trkj78Swl9pc8Wx_XuqRoPJujTgiac',
  )

  return supabase
}