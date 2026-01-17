import { browseApi } from '../api/browseApi'

export const browseService = {
  brands: browseApi.brands,
  seriesByBrand: browseApi.seriesByBrand,
  years: browseApi.years,
  carsBySerie: browseApi.carsBySerie,
  carsByYear: browseApi.carsByYear,
  availableBrands: browseApi.availableBrands,
  availableSeries: browseApi.availableSeries,
  availableYears: browseApi.availableYears
}
