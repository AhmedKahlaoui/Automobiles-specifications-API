import { Link } from 'react-router-dom'
import { Page } from '../components/layout/Page'
import { Card } from '../components/ui/Card'

export function HomePage() {
  return (
    <Page title="Automobile Specs" subtitle="Search, compare, browse, and manage cars.">
      <div className="grid" style={{ gap: 14 }}>
        <Card>
          <h3 style={{ marginTop: 0 }}>Start here</h3>
          <p style={{ color: 'var(--muted)' }}>Use Search to find car IDs, then Compare them side-by-side.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/search">Go to Search</Link>
            <Link to="/compare">Go to Compare</Link>
            <Link to="/browse">Go to Browse</Link>
          </div>
        </Card>
      </div>
    </Page>
  )
}
