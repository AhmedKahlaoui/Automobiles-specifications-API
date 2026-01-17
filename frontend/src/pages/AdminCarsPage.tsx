import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Page } from '../components/layout/Page'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { adminService } from '../services/adminService'
import { useAuth } from '../hooks/useAuth'

const createSchema = z.object({
  brand: z.string().min(1),
  model: z.string().min(1),
  year: z.coerce.number().int(),
  horsepower: z.coerce.number().int().optional(),
  combined_mpg: z.coerce.number().optional(),
  acceleration_0_100: z.coerce.number().optional(),
  vitesse_max: z.coerce.number().int().optional(),
  torque_nm: z.coerce.number().int().optional()
})

type CreateForm = z.infer<typeof createSchema>

const updateSchema = z.object({
  carId: z.coerce.number().int(),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.coerce.number().int().optional(),
  horsepower: z.coerce.number().int().optional(),
  combined_mpg: z.coerce.number().optional(),
  acceleration_0_100: z.coerce.number().optional(),
  vitesse_max: z.coerce.number().int().optional(),
  torque_nm: z.coerce.number().int().optional()
})

type UpdateForm = z.infer<typeof updateSchema>

const deleteSchema = z.object({
  carId: z.coerce.number().int()
})

type DeleteForm = z.infer<typeof deleteSchema>

export function AdminCarsPage() {
  const { auth } = useAuth()

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { brand: '', model: '', year: new Date().getFullYear() }
  })

  const updateForm = useForm<UpdateForm>({
    resolver: zodResolver(updateSchema),
    defaultValues: { carId: 0 }
  })

  const deleteForm = useForm<DeleteForm>({
    resolver: zodResolver(deleteSchema),
    defaultValues: { carId: 0 }
  })

  const create = useMutation({
    mutationFn: (values: CreateForm) => {
      if (!auth.token) throw new Error('Not authenticated')
      return adminService.createCar(auth.token, values)
    }
  })

  const update = useMutation({
    mutationFn: (values: UpdateForm) => {
      if (!auth.token) throw new Error('Not authenticated')
      const { carId, ...rest } = values
      // Remove empty strings so we don't overwrite fields with blanks.
      const payload: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(rest)) {
        if (v === undefined) continue
        if (typeof v === 'string' && !v.trim()) continue
        payload[k] = v
      }
      return adminService.updateCar(auth.token, carId, payload)
    }
  })

  const del = useMutation({
    mutationFn: (values: DeleteForm) => {
      if (!auth.token) throw new Error('Not authenticated')
      return adminService.deleteCar(auth.token, values.carId)
    }
  })

  const message = useMemo(() => (create.data ? `Created car ID: ${(create.data as any).car?.id ?? ''}` : null), [create.data])
  const updateMessage = useMemo(() => (update.data ? `Updated car ID: ${(update.data as any).car?.id ?? ''}` : null), [update.data])
  const deleteMessage = useMemo(() => (del.data ? `Deleted car ID: ${(deleteForm.getValues() as any).carId ?? ''}` : null), [del.data, deleteForm])

  return (
    <Page title="Admin · Cars" subtitle="Requires JWT with is_admin=true (Authorization: Bearer …).">
      {!auth.isAuthenticated ? <Alert tone="info">Login first, then come back here.</Alert> : null}
      {auth.isAuthenticated && !auth.isAdmin ? <Alert tone="danger">Your token is not admin.</Alert> : null}

      <h3 style={{ marginTop: 16 }}>Create</h3>
      <form onSubmit={form.handleSubmit((v) => create.mutate(v))} style={{ display: 'grid', gap: 10, maxWidth: 520, marginTop: 12 }}>
        {create.isError ? <Alert tone="danger">{(create.error as any)?.message ?? 'Create failed'}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Brand *</div>
            <Input {...form.register('brand')} />
          </label>
          <label>
            <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Model *</div>
            <Input {...form.register('model')} />
          </label>
        </div>

        <label>
          <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Year *</div>
          <Input type="number" {...form.register('year')} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Horsepower</div>
            <Input type="number" {...form.register('horsepower')} />
          </label>
          <label>
            <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Combined MPG</div>
            <Input type="number" step="0.1" {...form.register('combined_mpg')} />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <div style={{ color: 'var(--muted)', marginBottom: 6 }}>0-100 (s)</div>
            <Input type="number" step="0.1" {...form.register('acceleration_0_100')} />
          </label>
          <label>
            <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Top speed (km/h)</div>
            <Input type="number" {...form.register('vitesse_max')} />
          </label>
        </div>

        <label>
          <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Torque (Nm)</div>
          <Input type="number" {...form.register('torque_nm')} />
        </label>

        <Button type="submit" disabled={create.isPending || !auth.token || !auth.isAdmin}>
          {create.isPending ? 'Creating…' : 'Create car'}
        </Button>
      </form>

      <h3 style={{ marginTop: 28 }}>Update</h3>
      <form onSubmit={updateForm.handleSubmit((v) => update.mutate(v))} style={{ display: 'grid', gap: 10, maxWidth: 520, marginTop: 12 }}>
        {update.isError ? <Alert tone="danger">{(update.error as any)?.message ?? 'Update failed'}</Alert> : null}
        {updateMessage ? <Alert tone="success">{updateMessage}</Alert> : null}

        <label>
          <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Car ID *</div>
          <Input type="number" {...updateForm.register('carId')} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Brand</div>
            <Input {...updateForm.register('brand')} />
          </label>
          <label>
            <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Model</div>
            <Input {...updateForm.register('model')} />
          </label>
        </div>

        <label>
          <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Year</div>
          <Input type="number" {...updateForm.register('year')} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Horsepower</div>
            <Input type="number" {...updateForm.register('horsepower')} />
          </label>
          <label>
            <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Combined MPG</div>
            <Input type="number" step="0.1" {...updateForm.register('combined_mpg')} />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <div style={{ color: 'var(--muted)', marginBottom: 6 }}>0-100 (s)</div>
            <Input type="number" step="0.1" {...updateForm.register('acceleration_0_100')} />
          </label>
          <label>
            <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Top speed (km/h)</div>
            <Input type="number" {...updateForm.register('vitesse_max')} />
          </label>
        </div>

        <label>
          <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Torque (Nm)</div>
          <Input type="number" {...updateForm.register('torque_nm')} />
        </label>

        <Button type="submit" disabled={update.isPending || !auth.token || !auth.isAdmin}>
          {update.isPending ? 'Updating…' : 'Update car'}
        </Button>
      </form>

      <h3 style={{ marginTop: 28 }}>Delete</h3>
      <form onSubmit={deleteForm.handleSubmit((v) => del.mutate(v))} style={{ display: 'grid', gap: 10, maxWidth: 520, marginTop: 12 }}>
        {del.isError ? <Alert tone="danger">{(del.error as any)?.message ?? 'Delete failed'}</Alert> : null}
        {deleteMessage ? <Alert tone="success">{deleteMessage}</Alert> : null}
        <label>
          <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Car ID *</div>
          <Input type="number" {...deleteForm.register('carId')} />
        </label>
        <Button type="submit" disabled={del.isPending || !auth.token || !auth.isAdmin}>
          {del.isPending ? 'Deleting…' : 'Delete car'}
        </Button>
      </form>
    </Page>
  )
}
