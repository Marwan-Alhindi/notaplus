"use client";
import { useRouter } from 'next/router'
import { useState } from 'react'
import client from '@/utils/supabase/supabaseClient' // Use the centralized Supabase client
import styles from '@/styles/login.module.css'

export default function SignUpPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function signUp() {
    setMessage(null)
    const { data, error } = await client.auth.signUp({ email, password })
    if (error) {
      setMessage(`Sign-up failed: ${error.message}`)
      return
    }
    if (!data.session) {
      const isExisting = !data.user || !data.user.identities || data.user.identities.length === 0
      setMessage(
        isExisting
          ? `That email is already registered. Try signing in or resetting your password.`
          : `Account created. Check ${email} for a confirmation link — you must confirm before you can sign in.`
      )
      return
    }
    router.push('/main')
  }

  async function signInWithGoogle() {
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/main`
      }
    })
  
    if (error) {
      console.error(error)
      // Optional: set error message state here.
      return
    }
    
    // No immediate redirect here; Supabase will handle it after OAuth is completed.
  }

  return (
    <main className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <h1 className={styles.loginTitle}>Sign Up</h1>

        <button onClick={signInWithGoogle} className={styles.googleButton}>
          <img
            src="/google-icon.png"
            alt="Google Logo"
            className={styles.googleIcon}
          />
          Sign up with Google
        </button>

        <hr className={styles.divider} />

        <label htmlFor="email" className={styles.inputLabel}>
          Email address
        </label>
        <input
          id="email"
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.inputField}
        />

        <label htmlFor="password" className={styles.inputLabel}>
          Create a Password
        </label>
        <input
          id="password"
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.inputField}
        />

        <button onClick={signUp} className={styles.signInButton}>
          Sign up
        </button>

        {message && (
          <div style={{ marginTop: 12, color: '#f87171', fontSize: 14 }}>
            {message}
          </div>
        )}

        <div className={styles.linkContainer}>
          Already have an account?{' '}
          <a href="/" className={styles.link}>
            Sign in
          </a>
        </div>
      </div>
    </main>
  )
}