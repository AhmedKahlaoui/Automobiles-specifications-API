import { adminApi } from '../api/adminApi'
import type { CarSpec } from '../api/types'

export const adminService = {
  createCar: (token: string, data: Partial<CarSpec> & { brand: string; model: string; year: number }) => adminApi.createCar(token, data),
  updateCar: (token: string, carId: number, data: Partial<CarSpec>) => adminApi.updateCar(token, carId, data),
  deleteCar: (token: string, carId: number) => adminApi.deleteCar(token, carId)
}
