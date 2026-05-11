import WorkflowAnimation from './landing/WorkflowSection'
import { useTheme } from '../hooks/useTheme'
import SiteNav from '../components/SiteNav'

export default function WorkflowPage() {
  const [theme, toggleTheme] = useTheme()

  return (
    <div className="landing-v2" data-accent="clay" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <SiteNav theme={theme} onToggleTheme={toggleTheme} active="workflow" />

      {/* Animation fills the rest of the viewport below the nav */}
      <div style={{ position: 'fixed', top: 64, left: 0, right: 0, bottom: 0 }}>
        <WorkflowAnimation />
      </div>
    </div>
  )
}
