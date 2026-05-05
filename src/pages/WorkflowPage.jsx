import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import WorkflowAnimation from './landing/WorkflowSection'
import { useNavigateHomeTop } from '../utils/homeNavigation'

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
  return [theme, () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))]
}

export default function WorkflowPage() {
  const [theme, toggleTheme] = useTheme()
  const goHomeTop = useNavigateHomeTop()

  return (
    <div className="landing-v2" data-accent="clay" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* Nav - same hi-nav class as landing, fully fixed */}
      <nav className="hi-nav">
        <Link to="/" onClick={goHomeTop} className="hi-nav-brand" style={{ textDecoration: 'none' }}>
          <img src="/callohm-logo.png" alt="CallOHM" className="hi-nav-logo" />
          <div className="hi-nav-name">CallOHM<span className="dot">.</span></div>
        </Link>

        <div className="hi-nav-links">
          <Link to="/" onClick={goHomeTop} className="hi-nav-link">Home</Link>
          <span className="hi-nav-link active">Workflow</span>
          <Link to="/customers" className="hi-nav-link">Customers</Link>
          <Link to="/pricing" className="hi-nav-link">Pricing</Link>
        </div>

        <div className="hi-nav-cta">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link to="/login" className="hi-nav-link">Sign in</Link>
        </div>
      </nav>

      {/* Animation fills the rest of the viewport below the nav */}
      <div style={{ position: 'fixed', top: 64, left: 0, right: 0, bottom: 0 }}>
        <WorkflowAnimation />
      </div>
    </div>
  )
}
