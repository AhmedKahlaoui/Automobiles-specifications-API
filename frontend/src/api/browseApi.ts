import { httpJson } from './http'
import type { SearchCar } from './types'

export type FilterCarsResponse = {
  cars: SearchCar[]
  total: number
  page: number
  per_page: number
  pages: number
}

export const browseApi = {
  brands: () => httpJson<{ brands: Array<{ brand: string; count: number }>; total: number }>('/browse/brands'),
  seriesByBrand: (brand: string) =>
    httpJson<{ brand: string; series: Array<{ serie: string; count: number }>; total: number }>(`/browse/brands/${encodeURIComponent(brand)}/series`),
  years: () => httpJson<{ years: Array<{ year: number; count: number }>; total: number }>('/browse/years'),

  carsBySerie: (serie: string, params?: { page?: number; per_page?: number }) =>
    httpJson<FilterCarsResponse & { serie: string }>(`/filter/by-serie/${encodeURIComponent(serie)}`, { query: params as any }),
  carsByYear: (year: number, params?: { page?: number; per_page?: number }) =>
    httpJson<FilterCarsResponse & { year: number }>(`/filter/by-year/${encodeURIComponent(String(year))}`, { query: params as any }),

  availableBrands: (limit = 50) => httpJson<{ available_brands: Array<{ brand: string; count: number }>; total_brands: number }>('/available/brands', { query: { limit } }),
  availableSeries: (limit = 50) => httpJson<{ available_series: Array<{ series: string; count: number }>; total_unique_series: number }>('/available/series', { query: { limit } }),
  availableYears: () => httpJson<{ available_years: Array<{ year: number; count: number }> }>('/available/years')
}
