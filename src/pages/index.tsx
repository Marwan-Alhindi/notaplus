"use client"
import { useRouter } from 'next/router'
import { useState } from 'react'
import client from '@/utils/supabase/supabaseClient' // Use the centralized Supabase client
import styles from '@/styles/login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [user, setUser] = useState(null);

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  async function logIn() {
    setErrorMessage('') // Clear any existing error messages
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) {
      console.error(error)
      setErrorMessage('Invalid email or password. Please try again.')
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
        <h1 className={styles.loginTitle}>Login</h1>

        <button onClick={signInWithGoogle} className={styles.googleButton}>
          <img
            src="/google-icon.png"
            alt="Google Logo"
            className={styles.googleIcon}
          />
          Sign in with Google
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
          Your Password
        </label>
        <input
          id="password"
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.inputField}
        />

        {errorMessage && (
          <div className={styles.errorMessage}>
            {errorMessage}
          </div>
        )}

        <button onClick={logIn} className={styles.signInButton}>
          Sign in
        </button>

        <div className={styles.linkContainer}>
          <a href="/forgot-password" className={styles.link}>
            Forgot your password?
          </a>
        </div>

        <div className={styles.linkContainer}>
          Don't have an account?{' '}
          <a href="/signup" className={styles.link}>
            Sign up
          </a>
        </div>
      </div>
    </main>
  )
}