import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../hooks/useTheme'
import SiteNav from '../components/SiteNav'

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
}

export default function PricingPage() {
  const [theme, toggleTheme] = useTheme()

  return (
    <div className="landing-v2" data-accent="clay" data-theme-scope={theme} style={{ minHeight: '100vh' }}>

      <SiteNav theme={theme} onToggleTheme={toggleTheme} active="pricing" />

      {/* Hero */}
      <section
        className="landing-container"
        style={{ paddingTop: 140, paddingBottom: 80, textAlign: 'center' }}
      >
        <motion.span
          variants={fade} initial="hidden" animate="show" custom={0}
          className="eyebrow"
          style={{ display: 'inline-block', marginBottom: 22 }}
        >
          pricing
        </motion.span>

        <motion.h1
          variants={fade} initial="hidden" animate="show" custom={1}
          style={{
            fontSize: 'clamp(2.6rem, 5.6vw, 4.2rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.035em',
            margin: '0 auto 24px',
            maxWidth: 880,
            fontFamily: 'var(--display)',
            color: 'var(--ink)',
          }}
        >
          Pricing that fits<br />
          <em style={{ color: 'var(--accent)' }}>your volume.</em>
        </motion.h1>

        <motion.p
          variants={fade} initial="hidden" animate="show" custom={2}
          style={{
            color: 'var(--ink-3)',
            fontSize: 18,
            lineHeight: 1.65,
            maxWidth: 620,
            margin: '0 auto 36px',
          }}
        >
          Tell us what you want to launch, how much volume you expect, and what
          support you need - we&apos;ll shape a clear pricing plan around it.
        </motion.p>

        <motion.div
          variants={fade} initial="hidden" animate="show" custom={3}
          style={{ display: 'inline-flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <Link to="/book-demo" className="btn btn-primary btn-arrow">
            Talk to us <ArrowRight size={15} />
          </Link>
          <a href="mailto:support@callohm.com" className="btn btn-ghost">
            support@callohm.com
          </a>
        </motion.div>
      </section>

      {/* Custom plan card */}
      <section className="landing-container" style={{ paddingBottom: 120 }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'relative',
            maxWidth: 760,
            margin: '0 auto',
            background: 'var(--surface)',
            border: '1px solid var(--hair)',
            borderRadius: 28,
            padding: '56px 56px 52px',
            overflow: 'hidden',
          }}
        >
          {/* Soft accent glow */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: -120, right: -120,
              width: 280, height: 280,
              borderRadius: '50%',
              background: 'var(--accent-tint)',
              filter: 'blur(40px)',
              opacity: 0.7,
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative' }}>
            <div
              style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                fontFamily: 'var(--mono)',
                marginBottom: 14,
              }}
            >
              Custom plan
            </div>

            <h2
              style={{
                fontSize: 'clamp(1.6rem, 2.6vw, 2.1rem)',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                fontFamily: 'var(--display)',
                color: 'var(--ink)',
                margin: '0 0 14px',
              }}
            >
              Need something built around <em style={{ color: 'var(--accent)' }}>compliance, scale,</em> or a specific workflow?
            </h2>

            <p
              style={{
                fontSize: 16,
                lineHeight: 1.7,
                color: 'var(--ink-3)',
                margin: '0 0 28px',
                maxWidth: 580,
              }}
            >
              We can shape a custom commercial plan around your team, your timeline,
              and your operating model.
            </p>

            <Link to="/book-demo" className="btn btn-primary btn-arrow">
              Talk to us <ArrowRight size={15} />
            </Link>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            textAlign: 'center',
            marginTop: 28,
            color: 'var(--ink-4)',
            fontSize: 13,
            fontFamily: 'var(--mono)',
            letterSpacing: '0.04em',
          }}
        >
          No long-term commitment · Setup in under 15 minutes
        </motion.p>
      </section>
    </div>
  )
}
