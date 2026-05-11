import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Copy, Check, Phone } from 'lucide-react'
import Hero from './Hero'
import {
  WhyExistsSection,
  HowItWorksSection,
  WhatYouGetSection,
  AnalyticsSection,
  WhyUsSection,
  FaqSection,
  FinalCtaSection,
} from './Sections'
import { useNavigateHomeTop } from '../../utils/homeNavigation'
import { useTheme } from '../../hooks/useTheme'
import SiteNav from '../../components/SiteNav'

const SUPPORT_EMAIL = 'meena.atmakuri@purviewservices.com'
const SUPPORT_PHONE_DISPLAY = '+91 70328 35934'
const SUPPORT_PHONE_DIAL = '+917032835934'

/* ─── Logos ─── */
const COLLEGES = [
  { name: 'SCETW',      logo: '/college_logos/stanley.png' },
  { name: 'CBIT',       logo: '/college_logos/CBIT-LOGO-2023.png' },
  { name: 'VCE',        logo: '/college_logos/vasavi.jpg' },
  { name: 'VNRVJIET',   logo: '/college_logos/vnrvjit.png' },
  { name: 'VJIT',       logo: '/college_logos/vjit.png' },
  { name: 'AU',         logo: '/college_logos/anurag.png' },
  { name: 'KLH',        logo: '/college_logos/klu.png' },
  { name: 'MRU',        logo: '/college_logos/malla reddy.png' },
  { name: 'MLRITM',     logo: '/college_logos/mlritm.png' },
  { name: 'GCET',       logo: '/college_logos/geetanjali.png' },
  { name: 'IARE',       logo: '/college_logos/IARE.jpg' },
  { name: 'GNITS',      logo: '/college_logos/narayanammma.png' },
]

const FOOTER_NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Workflow', to: '/workflow' },
  { label: 'Customers', to: '/customers' },
  { label: 'Pricing', to: '/pricing' },
]

function TrustSection() {
  return (
    <section className="v2-logos">
      <div className="landing-container">
        <div className="lp-section-header lp-section-header-tight">
          <span className="eyebrow no-line">Trusted by students and institutions</span>
          <h2 className="lp-section-title lp-section-title-sm">
            Helping students find the <em>right college</em>, faster
          </h2>
          <p className="lp-section-sub">
            Designed for modern, digital first admissions. Powered by the
            CallOHM AI platform, partnered with leading engineering colleges
            across India.
          </p>
        </div>
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

/* ─── Phone link: copy on desktop, tap-to-call on mobile ─── */
function PhoneLink({ display, dial }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(display).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <span className="hi-foot-phone">
      <a href={`tel:${dial}`} className="hi-foot-link hi-foot-phone-link">
        <Phone size={13} className="hi-foot-phone-icon" />
        {display}
      </a>
      <button
        className={`hi-foot-copy-btn${copied ? ' copied' : ''}`}
        onClick={handleCopy}
        aria-label="Copy phone number"
        title={copied ? 'Copied!' : 'Copy number'}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </span>
  )
}

/* ─── Footer accordion column ─── */
function FooterCol({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="hi-foot-col">
      {/* Desktop: static heading always visible */}
      <h4 className="hi-foot-col-heading">{title}</h4>
      {/* Mobile: tappable accordion row */}
      <button className="hi-foot-col-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="hi-foot-col-heading">{title}</span>
        <ChevronDown size={15} className={`hi-foot-chevron${open ? ' open' : ''}`} />
      </button>
      <div className={`hi-foot-links${open ? ' hi-foot-links-open' : ''}`}>
        {children}
      </div>
    </div>
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
              <div className="hi-nav-name">CallOHM</div>
            </Link>
            <p className="hi-foot-copy">
              AI guided college admissions. Find your right fit, apply with
              confidence, and track every step in one place.
            </p>
          </div>

          <FooterCol title="Navigate">
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
          </FooterCol>

          <FooterCol title="Contact">
            <Link to="/book-demo" className="hi-foot-link">Book a demo</Link>
            <PhoneLink display={SUPPORT_PHONE_DISPLAY} dial={SUPPORT_PHONE_DIAL} />
            <a href={`mailto:${SUPPORT_EMAIL}`} className="hi-foot-link">{SUPPORT_EMAIL}</a>
            <a href="https://purviewservices.com" target="_blank" rel="noreferrer" className="hi-foot-link">
              Purview Services
            </a>
          </FooterCol>
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
      <SiteNav theme={theme} onToggleTheme={toggleTheme} active="home" />
      <Hero />
      <WhyExistsSection />
      <HowItWorksSection />
      <WhatYouGetSection />
      <AnalyticsSection />
      <WhyUsSection />
      <TrustSection />
      <FaqSection />
      <FinalCtaSection />
      <Footer onHomeTop={goHomeTop} />
    </div>
  )
}
