import styles from './Spinner.module.css'

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className={styles.wrap} aria-busy="true">
      <div className={styles.spinner} />
      <span className={styles.label}>{label}</span>
    </div>
  )
}
