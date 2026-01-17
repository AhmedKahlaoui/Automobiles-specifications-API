import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { SearchPage } from '../pages/SearchPage'
import { CarDetailsPage } from '../pages/CarDetailsPage'
import { ComparePage } from '../pages/ComparePage'
import { RankingsPage } from '../pages/RankingsPage'
import { AdminCarsPage } from '../pages/AdminCarsPage'
import { BrowsePage } from '../pages/BrowsePage'
import { FavoritesPage } from '../pages/FavoritesPage'
import { BrowseSeriePage } from '../pages/BrowseSeriePage'
import { BrowseYearPage } from '../pages/BrowseYearPage'

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/cars/:carId', element: <CarDetailsPage /> },
      { path: '/compare', element: <ComparePage /> },
      { path: '/rankings', element: <RankingsPage /> },
      { path: '/browse', element: <BrowsePage /> },
      { path: '/browse/series/:serie', element: <BrowseSeriePage /> },
      { path: '/browse/years/:year', element: <BrowseYearPage /> },
      { path: '/favorites', element: <FavoritesPage /> },
      { path: '/admin/cars', element: <AdminCarsPage /> },
      { path: '/auth/login', element: <LoginPage /> },
      { path: '/auth/register', element: <RegisterPage /> }
    ]
  }
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
