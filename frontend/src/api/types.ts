export type CarSpec = {
  brand?: string
  model?: string
  year?: number
  serie?: string
  price?: number
  [key: string]: unknown
}

export type SearchCar = {
  id: number
  spec: CarSpec
}

export type SimilarCar = SearchCar & {
  similarity_score: number | null
}

export type SimilarCarsResponse = {
  reference_car_id: number
  reference_car_spec: CarSpec
  similar_cars: SimilarCar[]
  total_results: number
}

export type CompareCar = {
  id: number
  spec: CarSpec
  metrics?: Record<string, unknown>
  winning_metrics?: Array<{ metric: string; metric_display: string; value: unknown }>
}

export type ComparisonWinner = {
  car_id: number
  value: unknown
  metric_display: string
}

export type CompareResponse = {
  cars: CompareCar[]
  comparison_winners: Record<string, ComparisonWinner>
  total_cars: number
}

export type AuthRegisterRequest = { username: string; password: string; is_admin?: boolean }
export type AuthLoginRequest = { username: string; password: string }
export type AuthLoginResponse = { access_token: string }

export type AvailableMetric = {
  name: string
  display: string
  description: string
  direction: string
  usage: string
}
