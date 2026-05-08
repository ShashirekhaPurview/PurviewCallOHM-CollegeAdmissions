import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import {
  ArrowRight, Upload, Bot, ListChecks, BarChart3,
  Mic2, PhoneOutgoing, Activity, RotateCw, LineChart, LayoutDashboard,
  Cpu, GraduationCap, Zap, FileLineChart,
  Plus,
} from 'lucide-react'

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
})

/* ─────────── Why this exists ─────────── */
export function WhyExistsSection() {
  return (
    <section className="lp-section">
      <div className="landing-container">
        <motion.div className="lp-section-header" {...fade(0)}>
          <span className="eyebrow no-line">Why this exists</span>
          <h2 className="lp-section-title">
            Admissions teams are stretched thin. <em>We give them leverage.</em>
          </h2>
          <p className="lp-section-sub">
            An intake season means thousands of enquiries, hundreds of
            callbacks, and a small counselling team. Spreadsheets and manual
            dialing leave seats unfilled. CallOHM is the bridge between your
            enquiry list and a full intake.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ─────────── How it works ─────────── */
const HOW_STEPS = [
  {
    icon: Upload,
    num: '01',
    title: 'Launch a campaign',
    body: 'Upload your enquiry list or sync from your CRM. Segment by program, region, score band, or source. Set the pace.',
  },
  {
    icon: Bot,
    num: '02',
    title: 'Agent has the conversation',
    body: 'Pitches your college, walks the candidate through facilities, hostel, fees, scholarships, and answers every doubt.',
  },
  {
    icon: ListChecks,
    num: '03',
    title: 'Captures requirements live',
    body: 'Interest, intent, branch preference, score, location, and follow-up timing - tagged the moment they are mentioned.',
  },
  {
    icon: BarChart3,
    num: '04',
    title: 'Hands qualified leads over',
    body: 'Recommended branch, candidate fit score, and full transcript handed to your counsellor. Ready to close.',
  },
]

export function HowItWorksSection() {
  return (
    <section className="lp-section">
      <div className="landing-container">
        <motion.div className="lp-section-header" {...fade(0)}>
          <span className="eyebrow no-line">How it works</span>
          <h2 className="lp-section-title">From enquiry list to <em>filled intake</em>, in four steps</h2>
        </motion.div>
        <div className="lp-steps lp-steps-4">
          {HOW_STEPS.map(({ icon: Icon, num, title, body }, i) => (
            <motion.div key={num} className="lp-step" {...fade(0.05 + i * 0.06)}>
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

/* ─────────── What you get ─────────── */
const WHAT_YOU_GET = [
  {
    icon: Mic2,
    title: 'Counsellor-grade conversations',
    body: 'Pitches your college, walks candidates through facilities, fees, hostel, scholarships, placements - and clears every doubt in their language.',
  },
  {
    icon: PhoneOutgoing,
    title: 'Campaigns at intake scale',
    body: 'Launch outbound campaigns across thousands of leads in parallel with smart pacing. Your entire enquiry list dialled in days.',
  },
  {
    icon: Activity,
    title: 'Live requirements capture',
    body: 'Interest level, branch preference, score band, location, fee comfort, and callback timing - tagged the moment they come up.',
  },
  {
    icon: RotateCw,
    title: 'Automated follow-ups',
    body: 'Interested candidates get chased on the right cadence. Reminders, callback dialling, application nudges - the funnel never stalls.',
  },
  {
    icon: LineChart,
    title: 'Post-call analytics',
    body: 'Sentiment per call, drop-off reasons, branch affinity, agent script lift. Know exactly which messaging is winning seats.',
  },
  {
    icon: LayoutDashboard,
    title: 'One admissions dashboard',
    body: 'Lead, conversation, callback, counsellor meeting, application, enrolment - your entire intake funnel in a single view.',
  },
]

export function WhatYouGetSection() {
  return (
    <section className="lp-section lp-section-tinted">
      <div className="landing-container">
        <motion.div className="lp-section-header" {...fade(0)}>
          <span className="eyebrow no-line">What you get</span>
          <h2 className="lp-section-title">A full admissions stack, <em>not just a dialer</em></h2>
          <p className="lp-section-sub">
            CallOHM covers the entire funnel from first call to filled seat,
            with live qualification and post-call analytics built in.
          </p>
        </motion.div>
        <div className="lp-features">
          {WHAT_YOU_GET.map(({ icon: Icon, title, body }, i) => (
            <motion.div key={title} className="lp-feature" {...fade(0.05 + i * 0.06)}>
              <div className="lp-feature-icon">
                <Icon size={18} strokeWidth={2} />
              </div>
              <h3 className="lp-feature-title">{title}</h3>
              <p className="lp-feature-body">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────── Post-call analytics deep dive ─────────── */
const ANALYTICS_HIGHLIGHTS = [
  { stat: 'Per call', label: 'Sentiment, intent, branch interest, objections' },
  { stat: 'Per cohort', label: 'Drop-off reasons, conversion lift, callback hit rate' },
  { stat: 'Per script', label: 'Which openers, pitches, and rebuttals actually convert' },
  { stat: 'Per source', label: 'Quality of leads by program, region, and channel' },
]

export function AnalyticsSection() {
  return (
    <section className="lp-section">
      <div className="landing-container">
        <motion.div className="lp-section-header" {...fade(0)}>
          <span className="eyebrow no-line">Post-call analytics</span>
          <h2 className="lp-section-title">
            Stop guessing. <em>See what is actually working.</em>
          </h2>
          <p className="lp-section-sub">
            Every conversation is captured, tagged, and rolled up into the
            metrics admissions directors actually need. No more "how is the
            funnel going" guesswork in Monday meetings.
          </p>
        </motion.div>
        <div className="lp-analytics">
          {ANALYTICS_HIGHLIGHTS.map((row, i) => (
            <motion.div key={row.stat} className="lp-analytics-row" {...fade(0.05 + i * 0.05)}>
              <span className="lp-analytics-stat">{row.stat}</span>
              <span className="lp-analytics-label">{row.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────── Why CallOHM ─────────── */
const WHY_US = [
  {
    icon: Cpu,
    title: 'AI powered, not call-center scripts',
    body: 'Real reasoning per lead, not a junior caller reading a sheet. Conversations adapt to the candidate.',
  },
  {
    icon: GraduationCap,
    title: 'Built for engineering admissions',
    body: 'Cutoffs, branches, hostel policies, scholarship logic - the agent already knows the domain.',
  },
  {
    icon: Zap,
    title: 'Live in a week',
    body: 'No three-month integration. Upload a lead list, configure your agent, your first calls go out within days.',
  },
  {
    icon: FileLineChart,
    title: 'Transparent reporting',
    body: 'Every call logged. Every metric explained. Every lead traceable from enquiry to enrolment.',
  },
]

const COMPARISON = [
  { traditional: 'Counsellors dial 50 leads a day',          ai: 'AI dials your full list in a day' },
  { traditional: 'Excel disposition tracking, daily exports', ai: 'Live disposition and sentiment per call' },
  { traditional: 'Lost callbacks, dropped follow-ups',        ai: 'Automatic follow-up on the right cadence' },
  { traditional: '"How is the funnel?" guesswork',           ai: 'Real-time conversion analytics' },
  { traditional: 'Hire seasonal callers every intake',        ai: 'Scale without adding headcount' },
]

export function WhyUsSection() {
  return (
    <section className="lp-section lp-section-tinted">
      <div className="landing-container">
        <motion.div className="lp-section-header" {...fade(0)}>
          <span className="eyebrow no-line">Why CallOHM</span>
          <h2 className="lp-section-title">A better admissions engine, <em>by design</em></h2>
        </motion.div>

        <div className="lp-features">
          {WHY_US.map(({ icon: Icon, title, body }, i) => (
            <motion.div key={title} className="lp-feature" {...fade(0.05 + i * 0.06)}>
              <div className="lp-feature-icon">
                <Icon size={18} strokeWidth={2} />
              </div>
              <h3 className="lp-feature-title">{title}</h3>
              <p className="lp-feature-body">{body}</p>
            </motion.div>
          ))}
        </div>

        {/* Compact comparison strip */}
        <motion.div className="lp-compare" {...fade(0.1)}>
          <div className="lp-compare-row lp-compare-head">
            <span data-label="Traditional admissions ops">Traditional admissions ops</span>
            <span data-label="Admissions on CallOHM">Admissions on CallOHM</span>
          </div>
          {COMPARISON.map((row) => (
            <div key={row.ai} className="lp-compare-row">
              <span className="lp-compare-old" data-label="Traditional admissions ops">{row.traditional}</span>
              <span className="lp-compare-new" data-label="Admissions on CallOHM">{row.ai}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ─────────── FAQ ─────────── */
const FAQS = [
  {
    q: 'Does CallOHM replace our CRM?',
    a: 'No. CallOHM is the calling and analytics layer that sits on top of your existing lead source. Upload a CSV, sync from a Google Sheet, or hook into your CRM. Leads, dispositions, and outcomes flow back so your existing system stays the source of truth.',
  },
  {
    q: 'How does the AI agent handle objections, languages, and callbacks?',
    a: 'The agent is trained for admissions conversations specifically. It handles common objections (fees, placements, branch availability), switches to the candidate\'s preferred language mid-call when needed, and books callbacks at the candidate\'s requested time, automatically.',
  },
  {
    q: 'What about TRAI, DND, and consent compliance?',
    a: 'Calls are placed only against the leads you upload, with consent metadata captured. Standard TRAI window enforcement, opt-out handling, and DND scrubs are built in. We can share the full compliance brief during the demo.',
  },
  {
    q: 'How fast can we go live?',
    a: 'Most colleges go live within a week. Day 1 is onboarding and agent configuration. By end of the week, your first cohort is being called and dispositions are flowing into the dashboard.',
  },
  {
    q: 'How does pricing work?',
    a: 'Per-call pricing for outbound conversations, plus a per-month platform fee that scales with intake volume. No long contracts. We share full pricing on the demo call once we know your intake size.',
  },
  {
    q: 'Who owns the call data?',
    a: 'You do. Recordings, transcripts, analytics, and lead state are all yours. Export anytime, delete anytime.',
  },
]

export function FaqSection() {
  const [open, setOpen] = useState(0)
  return (
    <section className="lp-section">
      <div className="landing-container">
        <motion.div className="lp-section-header" {...fade(0)}>
          <span className="eyebrow no-line">FAQ</span>
          <h2 className="lp-section-title">Quick answers, <em>before the demo</em></h2>
        </motion.div>
        <div className="lp-faq">
          {FAQS.map((item, i) => {
            const isOpen = open === i
            return (
              <motion.div
                key={item.q}
                className={`lp-faq-item${isOpen ? ' is-open' : ''}`}
                {...fade(0.04 * i)}
              >
                <button
                  type="button"
                  className="lp-faq-q"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <Plus
                    size={16}
                    style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 200ms' }}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <p className="lp-faq-a">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─────────── Final CTA ─────────── */
export function FinalCtaSection() {
  return (
    <section className="landing-container">
      <motion.div
        className="v2-cta-block"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="eyebrow no-line">Ready when your next intake is</span>
        <h2>Fill more seats. <em>Without adding headcount.</em></h2>
        <p>15 minute walkthrough. No slides. We open your funnel inside CallOHM and show you what an AI-driven intake looks like.</p>
        <div className="btn-row">
          <Link to="/book-demo" className="btn btn-primary btn-arrow">
            Book a demo <ArrowRight size={15} />
          </Link>
          <Link to="/workflow" className="btn btn-ghost">
            See the live workflow
          </Link>
        </div>
      </motion.div>
    </section>
  )
}
