"use server"
import { type GetServerSidePropsContext } from 'next'
import { createServerClient, serializeCookieHeader } from '@supabase/ssr'

export function createClient({ req, res }: GetServerSidePropsContext) {
  const supabase = createServerClient(
    'https://fxtmwtmgizficzbccedk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4dG13dG1naXpmaWN6YmNjZWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5MDM1NTUsImV4cCI6MjA0NzQ3OTU1NX0.p1Bwh7r60kol9trkj78Swl9pc8Wx_XuqRoPJujTgiac',
    {
      cookies: {
        getAll() {
          return Object.keys(req.cookies).map((name) => ({ name, value: req.cookies[name] || '' }))
        },
        setAll(cookiesToSet) {
          res.setHeader(
            'Set-Cookie',
            cookiesToSet.map(({ name, value, options }) =>
              serializeCookieHeader(name, value, options)
            )
          )
        },
      },
    }
  )

  return supabase
}