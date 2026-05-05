import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../../api/auth/authService'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, Moon, Sun, House } from 'lucide-react'

function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    const saved = localStorage.getItem('callohm-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.setAttribute('data-theme', 'dark')
    else root.removeAttribute('data-theme')
    localStorage.setItem('callohm-theme', theme)
  }, [theme])
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))]
}

const fade = {
  hidden: { opacity: 0, y: 12 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] } }),
}

const CAMPUS_IMG =
  'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?auto=format&fit=crop&w=1600&q=80'

function BrandMark({ light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/callohm-logo.png"
        alt="CallOHM"
        className="hi-nav-logo"
        style={light ? { filter: 'brightness(0) invert(1)' } : undefined}
      />
      <div className="leading-none">
        <div
          className="text-base font-semibold"
          style={{ color: light ? '#fff' : 'var(--ink)', letterSpacing: '-0.012em', fontFamily: 'var(--ui)' }}
        >
          CallOHM<span style={{ color: 'var(--accent)' }}>.</span>
        </div>
        <div
          className="mt-1 text-[10px] font-medium uppercase"
          style={{ color: light ? 'rgba(255,255,255,0.62)' : 'var(--ink-3)', letterSpacing: '0.18em', fontFamily: 'var(--mono)' }}
        >
          Admissions
        </div>
      </div>
    </div>
  )
}

function Field({ id, label, type = 'text', value, onChange, placeholder, trailing }) {
  return (
    <label className="block" htmlFor={id}>
      <span
        className="mb-2 block text-[11px] font-medium uppercase"
        style={{ color: 'var(--ink-3)', letterSpacing: '0.1em', fontFamily: 'var(--mono)' }}
      >
        {label}
      </span>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-2xl px-4 py-3.5 pr-12 text-sm outline-none transition-all duration-200"
          style={{ border: '1px solid var(--hair)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--ui)' }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.boxShadow = '0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--hair)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
        {trailing}
      </div>
    </label>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [theme, toggleTheme] = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Enter both your email address and password to continue.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/app/analytics')
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="landing-v2 relative min-h-screen"
      data-accent="clay"
      data-theme-scope={theme}
      style={{ background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--ui)' }}
    >
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">

        {/* Left: campus panel */}
        <aside className="relative hidden lg:flex flex-col overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url('${CAMPUS_IMG}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'saturate(0.85) contrast(0.95)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--ink) 78%, transparent) 0%, color-mix(in srgb, var(--ink) 55%, transparent) 50%, color-mix(in srgb, var(--accent) 55%, transparent) 100%)',
              mixBlendMode: 'multiply',
            }}
          />
          <div className="relative z-10 flex h-full flex-col p-10 xl:p-14 text-white">
            <Link to="/" style={{ textDecoration: 'none' }}>
              <BrandMark light />
            </Link>
            <div className="mt-auto">
              <h2
                style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 400,
                  fontSize: 'clamp(40px, 4.6vw, 64px)',
                  lineHeight: 1.02,
                  letterSpacing: '-0.022em',
                  color: '#fff',
                  textWrap: 'balance',
                }}
              >
                Every call.{' '}
                <em style={{ fontStyle: 'italic', color: 'color-mix(in srgb, var(--accent) 60%, white)' }}>
                  Every intake.
                </em>
              </h2>
              <p className="mt-5 max-w-sm" style={{ color: 'rgba(255,255,255,0.78)', fontSize: 15, lineHeight: 1.55 }}>
                One workspace for your admissions team.
              </p>
            </div>
          </div>
        </aside>

        {/* Right: login form */}
        <main className="relative flex flex-col">
          <div className="fixed top-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4 lg:justify-end w-full lg:w-1/2">
            <Link to="/" className="inline-flex lg:hidden" style={{ textDecoration: 'none' }}>
              <BrandMark />
            </Link>
            <div className="flex items-center gap-2">
              <button
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <Link to="/" className="theme-toggle" aria-label="Home">
                <House size={16} />
              </Link>
            </div>
          </div>

          <div className="relative z-10 flex flex-1 items-center justify-center px-5 sm:px-8 py-10">
            <div className="w-full max-w-md">
              <motion.div custom={0} variants={fade} initial="hidden" animate="show" className="mb-7">
                <h1
                  className="text-4xl sm:text-5xl"
                  style={{ fontFamily: 'var(--display)', fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 1.02 }}
                >
                  Sign <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>in.</em>
                </h1>
              </motion.div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <motion.div custom={1} variants={fade} initial="hidden" animate="show">
                  <Field
                    id="email"
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@institution.edu"
                  />
                </motion.div>

                <motion.div custom={2} variants={fade} initial="hidden" animate="show">
                  <Field
                    id="password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--ink-3)' }}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    }
                  />
                </motion.div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="rounded-2xl px-4 py-3 text-sm"
                      style={{
                        background: 'color-mix(in srgb, #C95955 14%, transparent)',
                        color: '#C95955',
                        border: '1px solid color-mix(in srgb, #C95955 28%, transparent)',
                      }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div custom={3} variants={fade} initial="hidden" animate="show" className="flex justify-end text-sm">
                  <a href="#reset" className="font-medium" style={{ color: 'var(--accent)' }}>Forgot password?</a>
                </motion.div>

                <motion.div custom={4} variants={fade} initial="hidden" animate="show">
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    className="btn btn-primary btn-arrow w-full justify-center"
                    style={{ padding: '14px 22px', fontSize: 15, fontWeight: 500 }}
                  >
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                          <motion.span
                            className="h-4 w-4 rounded-full border-2"
                            style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'var(--accent-ink)' }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                          />
                          Signing in…
                        </motion.span>
                      ) : (
                        <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                          Continue <ArrowRight size={16} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </motion.div>
              </form>

              <motion.div
                custom={5}
                variants={fade}
                initial="hidden"
                animate="show"
                className="mt-7 pt-6 text-center text-sm"
                style={{ borderTop: '1px solid var(--hair)', color: 'var(--ink-3)' }}
              >
                New here?{' '}
                <Link to="/book-demo" style={{ color: 'var(--accent)', fontWeight: 500 }}>Book a demo →</Link>
              </motion.div>
            </div>
          </div>
        </main>

      </div>
    </div>
  )
}
