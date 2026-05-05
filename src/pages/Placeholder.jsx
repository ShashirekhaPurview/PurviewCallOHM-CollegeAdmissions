import { motion } from 'framer-motion'

const C = {
  brand: '#6366F1', brandLight: '#EEF2FF',
  onix: '#111827', surface: '#FFFFFF',
  elevated: '#F3F4F6', subtle: '#E5E7EB',
  ink: '#111827', ink2: '#4B5563', ink3: '#9CA3AF',
}

export default function Placeholder({ title, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        {Icon && (
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-6"
            style={{ background: C.brandLight }}>
            <Icon size={28} style={{ color: C.brand }} />
          </div>
        )}
        <h1 className="text-2xl font-bold mb-2" style={{ color: C.ink }}>{title}</h1>
        <p className="text-sm" style={{ color: C.ink3 }}>This module is coming soon.</p>
      </motion.div>
    </div>
  )
}
