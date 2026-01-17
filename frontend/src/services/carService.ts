import { attendeeApi } from '../api/attendeeApi'

export const carService = {
  listCars: attendeeApi.listCars,
  getCar: attendeeApi.getCar,
  search: attendeeApi.search,
  compare: attendeeApi.compare,
  stats: attendeeApi.stats,
  topCars: attendeeApi.topCars,
  similarCars: attendeeApi.similarCars,
  availableMetrics: attendeeApi.availableMetrics
}
