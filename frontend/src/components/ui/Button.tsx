import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'danger'

export function Button({ variant = 'primary', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const v = variant === 'primary' ? styles.primary : variant === 'danger' ? styles.danger : styles.secondary
  return <button {...props} className={[styles.button, v, className].filter(Boolean).join(' ')} />
}
