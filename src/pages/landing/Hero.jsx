import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ListChecks, Phone, CalendarRange } from 'lucide-react'

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
})

const STEPS = [
  {
    icon: ListChecks,
    num: '01',
    title: 'Upload & run.',
    body: 'Segment by program, region or score. Set pace, pause and resume - no developer needed.',
  },
  {
    icon: Phone,
    num: '02',
    title: 'Call with context.',
    body: 'Smart queue, adaptive scripts and real-time disposition capture. Every conversation accounted for.',
  },
  {
    icon: CalendarRange,
    num: '03',
    title: 'Follow up, always.',
    body: 'Callbacks, campus visit scheduling and reminders - nothing drops between sessions.',
  },
]

const STATS = [
  { value: '185K+', label: 'calls placed every month' },
  { value: '32%', label: 'avg. lift in conversions' },
  { value: '50+', label: 'institutions onboarded' },
]

export default function Hero() {
  return (
    <section className="v2-hero">
      <div className="landing-container">
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

        <motion.p
          className="v2-sub"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        >
          Built for engineering admissions teams. Reach 12th-pass students at
          scale, track every call, and turn enquiries into seats - in real time.
        </motion.p>

        <motion.div
          className="v2-cta"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
        >
          <Link to="/book-demo" className="btn btn-primary btn-arrow">
            Book a demo <ArrowRight size={15} />
          </Link>
          <Link to="/workflow" className="btn btn-ghost">See how it works</Link>
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

        {/* Three steps */}
        <div className="lp-steps">
          {STEPS.map(({ icon: Icon, num, title, body }, i) => (
            <motion.div key={num} className="lp-step" {...fade(0.1 + i * 0.08)}>
              <div className="lp-step-icon">
                <Icon size={18} strokeWidth={2} />
              </div>
              <div className="lp-step-num">{num}</div>
              <h3 className="lp-step-title">{title}</h3>
              <p className="lp-step-body">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
