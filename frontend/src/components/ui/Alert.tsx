import type { ReactNode } from 'react'
import styles from './Alert.module.css'

type Tone = 'info' | 'danger' | 'success'

export function Alert({ tone = 'info', title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  const cls = tone === 'danger' ? styles.danger : tone === 'success' ? styles.success : styles.info
  return (
    <div className={[styles.alert, cls].join(' ')}>
      {title ? <div className={styles.title}>{title}</div> : null}
      <div className={styles.body}>{children}</div>
    </div>
  )
}
