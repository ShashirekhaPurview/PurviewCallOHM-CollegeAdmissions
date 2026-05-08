import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Clock, ShieldCheck, Sparkles } from 'lucide-react'

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
})

const STATS = [
  { value: '185K+', label: 'Admission calls placed every month' },
  { value: '32%', label: 'Average lift in conversions' },
  { value: '50+', label: 'Institutions onboarded' },
]

export default function Hero() {
  return (
    <section className="v2-hero">
      <div className="landing-container">
        {/* Eyebrow pill */}
        <motion.div
          className="v2-pill-wrap"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="eyebrow-pill">
            <span className="live" />
            Admissions automation for engineering colleges
            <span className="badge">2026</span>
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="v2-headline"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        >
          Fill every <span className="ital">engineering seat,</span>
          <br />
          one <span className="stroke">conversation</span> at a time.
        </motion.h1>

        {/* Subtext */}
        <motion.p
          className="v2-sub"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        >
          CallOHM is the AI admissions partner for engineering colleges. Run
          campaigns at scale, have real consultative conversations with every
          candidate, explain your facilities, clear every doubt, recommend
          the right branch, and walk into every counsellor meeting knowing
          which leads are ready to close.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="v2-cta"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
        >
          <Link to="/book-demo" className="btn btn-primary btn-arrow">
            Book a demo <ArrowRight size={15} />
          </Link>
          <Link to="/workflow" className="btn btn-ghost">
            See how it works
          </Link>
        </motion.div>

        {/* Reassurance row beneath CTAs */}
        <motion.div
          className="v2-cta-meta"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <span><Clock size={13} /> 15 minute walkthrough</span>
          <span><Sparkles size={13} /> Live with your data, not a slide deck</span>
          <span><ShieldCheck size={13} /> No CRM rip and replace</span>
        </motion.div>

        {/* Stats row */}
        <motion.div className="lp-stats" {...fade(0.1)}>
          {STATS.map((s) => (
            <div key={s.label} className="lp-stat">
              <div className="lp-stat-value">{s.value}</div>
              <div className="lp-stat-label">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
