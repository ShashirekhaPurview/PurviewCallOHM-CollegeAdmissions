import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Moon, Sun, Menu, X } from 'lucide-react'

const LINKS = [
  { key: 'home',      label: 'Home',      to: '/' },
  { key: 'workflow',  label: 'Workflow',  to: '/workflow' },
  { key: 'customers', label: 'Customers', to: '/customers' },
  { key: 'pricing',   label: 'Pricing',   to: '/pricing' },
]

export default function SiteNav({ theme, onToggleTheme, active }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const close = () => setMenuOpen(false)

  const handleHome = (e) => {
    e.preventDefault()
    close()
    navigate('/')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <nav className="hi-nav">
        {/* Brand */}
        <a href="/" onClick={handleHome} className="hi-nav-brand" style={{ textDecoration: 'none' }}>
          <img src="/callohm-logo.png" alt="CallOHM" className="hi-nav-logo" />
          <div className="hi-nav-name">CallOHM<span className="dot">.</span></div>
        </a>

        {/* Desktop links */}
        <div className="hi-nav-links">
          {LINKS.map(({ key, label, to }) =>
            key === 'home' ? (
              <a key={key} href="/" onClick={handleHome}
                className={`hi-nav-link${active === key ? ' active' : ''}`}>
                {label}
              </a>
            ) : (
              <Link key={key} to={to} className={`hi-nav-link${active === key ? ' active' : ''}`}>
                {label}
              </Link>
            )
          )}
        </div>

        {/* Right side: theme + sign in + hamburger */}
        <div className="hi-nav-cta">
          <button
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link to="/login" className="hi-nav-link">Sign in</Link>
          <button
            className="hi-nav-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="hi-nav-mobile-menu">
          {LINKS.map(({ key, label, to }) =>
            key === 'home' ? (
              <a key={key} href="/" onClick={handleHome}
                className={`hi-nav-mobile-link${active === key ? ' active' : ''}`}>
                {label}
              </a>
            ) : (
              <Link key={key} to={to} onClick={close}
                className={`hi-nav-mobile-link${active === key ? ' active' : ''}`}>
                {label}
              </Link>
            )
          )}
          <Link to="/login" onClick={close} className="hi-nav-mobile-link">Sign in</Link>
        </div>
      )}
    </>
  )
}
