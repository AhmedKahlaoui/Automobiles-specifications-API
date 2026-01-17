import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Page } from '../components/layout/Page'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { authService } from '../services/authService'
import { useAuth } from '../hooks/useAuth'
import { setFlash } from '../app/flash'

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const nav = useNavigate()
  const { setToken } = useAuth()
  const [inlineError, setInlineError] = useState<string | null>(null)

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { username: '', password: '' } })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => authService.login(values),
    onSuccess: (data) => {
      setToken(data.access_token)
      setFlash({ tone: 'success', text: 'Login successful' })
      nav('/')
    },
    onError: (err) => {
      const msg = (err as any)?.message ?? 'Login failed'
      setInlineError(msg)
    }
  })

  const errorMessage = useMemo(() => inlineError ?? (mutation.error as any)?.message ?? null, [inlineError, mutation.error])

  useEffect(() => {
    if (!errorMessage) return
    const t = window.setTimeout(() => setInlineError(null), 2500)
    return () => window.clearTimeout(t)
  }, [errorMessage])

  return (
    <Page title="Login">
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} style={{ display: 'grid', gap: 10, maxWidth: 420 }}>
        {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}
        <label>
          <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Username</div>
          <Input {...form.register('username')} />
        </label>
        <label>
          <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Password</div>
          <Input type="password" {...form.register('password')} />
        </label>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Logging in…' : 'Login'}
        </Button>
      </form>
    </Page>
  )
}
