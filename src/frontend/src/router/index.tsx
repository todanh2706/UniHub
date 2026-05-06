import { createBrowserRouter } from 'react-router-dom';

import StudentLayout from '../pages/student/Layout';
import StudentHome from '../pages/student/Home';
import WorkshopDetails from '../pages/student/WorkshopDetails';

import AdminLayout from '../pages/admin/Layout';
import AdminDashboard from '../pages/admin/Dashboard';

import CheckinLayout from '../pages/checkin/Layout';
import CheckinPortal from '../pages/checkin/CheckinPortal';
import LoginPage from '../pages/auth/LoginPage';
import SignUpPage from '../pages/auth/SignUpPage';
import ProtectedRoute from '../components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        path: '',
        element: <StudentLayout />,
        children: [
          {
            index: true,
            element: <StudentHome />
          },
          {
            path: 'workshops/:id',
            element: <WorkshopDetails />
          }
        ]
      },
      {
        path: 'admin',
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <AdminDashboard />
          }
        ]
      },
      {
        path: 'checkin',
        element: <CheckinLayout />,
        children: [
          {
            index: true,
            element: <CheckinPortal />
          }
        ]
      }
    ]
  },
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/signup',
    element: <SignUpPage />
  }
]);
