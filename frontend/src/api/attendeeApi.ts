import { httpJson } from './http'
import type { CarSpec, CompareResponse, SearchCar, SimilarCarsResponse } from './types'

export type ListCarsResponse = {
  cars: SearchCar[]
  total: number
  page: number
  per_page: number
  pages: number
}

export const attendeeApi = {
  listCars: (params: {
    q?: string
    brand?: string
    model?: string
    min_year?: number
    max_year?: number
    min_price?: number
    max_price?: number
    fuel_type?: string
    transmission?: string
    drive_type?: string
    cylinders?: number
    min_horsepower?: number
    max_horsepower?: number
    min_combined_mpg?: number
    max_combined_mpg?: number
    max_acceleration_0_100?: number
    min_vitesse_max?: number
    max_vitesse_max?: number
    min_torque_nm?: number
    max_torque_nm?: number
    page?: number
    per_page?: number
    sort_by?: string
    order?: string
  }) =>
    httpJson<ListCarsResponse>('/cars', { query: params }),

  getCar: (id: number) => httpJson<{ car: CarSpec }>(`/cars/${id}`),

  search: (q: string) => httpJson<{ cars: SearchCar[]; count: number }>('/cars/search', { query: { q } }),

  compare: (carIds: number[]) => httpJson<CompareResponse>('/cars/compare', { method: 'POST', body: { car_ids: carIds } }),

  stats: () => httpJson<any>('/cars/stats'),

  topCars: (metric: string, limit = 10) => httpJson<any>(`/cars/top/${encodeURIComponent(metric)}`, { query: { limit } }),

  similarCars: (carId: number, limit = 10) => httpJson<SimilarCarsResponse>(`/cars/${carId}/similar`, { query: { limit } }),

  availableMetrics: () => httpJson<{ metrics: any[] }>('/available/metrics')
}
