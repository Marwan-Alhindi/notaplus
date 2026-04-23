"use client";
import { useRouter } from 'next/router'
import { useState } from 'react'
import client from '@/utils/supabase/supabaseClient' // Use the centralized Supabase client
import styles from '@/styles/login.module.css'

export default function ForgotPasswordPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')

  async function sendResetInstructions() {
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login` // Use dynamic redirect for flexibility
    })
    if (error) {
      console.error(error)
      return
    }
    // Optionally show a success message or redirect to login.
    alert('Password reset instructions sent! Check your email.')
    router.push('/login')
  }

  return (
    <main className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <h1 className={styles.loginTitle}>Forgot Password</h1>

        <label htmlFor="email" className={styles.inputLabel}>Email address</label>
        <input
          id="email"
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.inputField}
        />

        <button onClick={sendResetInstructions} className={styles.signInButton}>
          Send reset password instructions
        </button>

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