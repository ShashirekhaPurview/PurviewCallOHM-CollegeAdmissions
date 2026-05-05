import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Moon, Sun } from 'lucide-react'
import Hero from './Hero'
import { useNavigateHomeTop } from '../../utils/homeNavigation'

/* ─── Theme ─── */
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

/* ─── Navbar ─── */
function Navbar({ theme, onToggleTheme, onHomeTop }) {
  return (
    <nav className="hi-nav">
      <Link to="/" onClick={onHomeTop} className="hi-nav-brand" style={{ textDecoration: 'none' }}>
        <img src="/callohm-logo.png" alt="CallOHM" className="hi-nav-logo" />
        <div className="hi-nav-name">CallOHM<span className="dot">.</span></div>
      </Link>
      <div className="hi-nav-links">
        <Link to="/" onClick={onHomeTop} className="hi-nav-link active">Home</Link>
        <Link to="/workflow" className="hi-nav-link">Workflow</Link>
        <Link to="/customers" className="hi-nav-link">Customers</Link>
        <Link to="/pricing"   className="hi-nav-link">Pricing</Link>
      </div>
      <div className="hi-nav-cta">
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <Link to="/login" className="hi-nav-link" style={{ cursor: 'pointer' }}>Sign in</Link>
        <Link to="/book-demo" className="btn btn-primary btn-arrow">
          Book a demo <ArrowRight size={15} />
        </Link>
      </div>
    </nav>
  )
}

/* ─── Logos ─── */
const COLLEGES = [
  { name: 'Stanley College',     logo: '/college_logos/stanley.png' },
  { name: 'CBIT',                logo: '/college_logos/CBIT-LOGO-2023.png' },
  { name: 'Vasavi College',      logo: '/college_logos/vasavi.jpg' },
  { name: 'VNR VJIET',           logo: '/college_logos/vnrvjit.png' },
  { name: 'VJIT',                logo: '/college_logos/vjit.png' },
  { name: 'Anurag University',   logo: '/college_logos/anurag.png' },
  { name: 'KL University',       logo: '/college_logos/klu.png' },
  { name: 'Malla Reddy',         logo: '/college_logos/malla reddy.png' },
  { name: 'MLRITM',              logo: '/college_logos/mlritm.png' },
  { name: 'Geethanjali',         logo: '/college_logos/geetanjali.jpg' },
  { name: 'IARE',                logo: '/college_logos/IARE.jpg' },
  { name: 'Narayanamma',         logo: '/college_logos/narayanammma.png' },
]

const FOOTER_NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Workflow', to: '/workflow' },
  { label: 'Customers', to: '/customers' },
  { label: 'Pricing', to: '/pricing' },
]

function Logos() {
  return (
    <section className="v2-logos">
      <div className="landing-container">
        <div className="v2-logos-label">Trusted by directors at</div>
      </div>
      <div className="logo-marquee" aria-hidden="false">
        <div className="logo-marquee-track">
          {[...COLLEGES, ...COLLEGES].map((c, i) => (
            <span key={`${c.name}-${i}`} className="logo-mark">
              <img src={c.logo} alt={c.name} className="logo-img" loading="lazy" />
              {c.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── CTA ─── */
function CtaBlock() {
  return (
    <section className="landing-container">
      <motion.div
        className="v2-cta-block"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="eyebrow no-line">get started</span>
        <h2>Ready when your <em>next intake</em> is.</h2>
        <p>15 minute call. No slides. A real walkthrough of your funnel inside CallOHM.</p>
        <div className="btn-row">
          <Link to="/book-demo" className="btn btn-primary btn-arrow">
            Book a demo <ArrowRight size={15} />
          </Link>
          <button className="btn btn-ghost">Talk to a founder</button>
        </div>
      </motion.div>
    </section>
  )
}

/* ─── Footer ─── */
function Footer({ onHomeTop }) {
  return (
    <footer className="hi-foot">
      <div className="landing-container">
        <div className="hi-foot-grid">
          <div className="hi-foot-brand">
            <Link to="/" onClick={onHomeTop} className="hi-nav-brand hi-foot-brand-link">
              <img src="/callohm-logo.png" alt="CallOHM" className="hi-nav-logo" />
              <div className="hi-nav-name">CallOHM<span className="dot">.</span></div>
            </Link>
            <p className="hi-foot-copy">
              Admissions voice operations for engineering institutions, from first outreach to follow-up.
            </p>
          </div>
          <div className="hi-foot-col">
            <h4>Navigate</h4>
            <div className="hi-foot-links">
              {FOOTER_NAV_LINKS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={item.to === '/' ? onHomeTop : undefined}
                  className="hi-foot-link"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="hi-foot-col">
            <h4>Contact</h4>
            <div className="hi-foot-links">
              <Link to="/book-demo" className="hi-foot-link">Book a demo</Link>
              <a href="mailto:support@callohm.com" className="hi-foot-link">support@callohm.com</a>
              <a
                href="https://purviewservices.com"
                target="_blank"
                rel="noreferrer"
                className="hi-foot-link"
              >
                Purview Services
              </a>
            </div>
          </div>
        </div>
        <div className="hi-foot-bottom">
          <span>&#169; {new Date().getFullYear()} CallOHM. All rights reserved.</span>
          <span>Built by Purview Services</span>
        </div>
      </div>
    </footer>
  )
}

/* ─── Page ─── */
export default function Landing() {
  const [theme, toggleTheme] = useTheme()
  const goHomeTop = useNavigateHomeTop()

  return (
    <div className="landing-v2" data-accent="clay" data-theme-scope={theme}>
      <div className="landing-container">
        <Navbar theme={theme} onToggleTheme={toggleTheme} onHomeTop={goHomeTop} />
      </div>
      <Hero />
      <Logos />
      <CtaBlock />
      <Footer onHomeTop={goHomeTop} />
    </div>
  )
}
