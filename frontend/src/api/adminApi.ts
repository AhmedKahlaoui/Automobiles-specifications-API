import { httpJson } from './http'
import type { CarSpec } from './types'

export const adminApi = {
  createCar: (token: string, data: Partial<CarSpec> & { brand: string; model: string; year: number }) =>
    httpJson<{ message: string; car: any }>('/admin/cars', { method: 'POST', token, body: data }),

  updateCar: (token: string, carId: number, data: Partial<CarSpec>) =>
    httpJson<{ message: string; car: any }>(`/admin/cars/${carId}`, { method: 'PUT', token, body: data }),

  deleteCar: (token: string, carId: number) => httpJson<{ message: string }>(`/admin/cars/${carId}`, { method: 'DELETE', token })
}
