import { createBrowserRouter } from 'react-router-dom';

import StudentLayout from '../pages/student/Layout';
import StudentHome from '../pages/student/Home';

import AdminLayout from '../pages/admin/Layout';
import AdminDashboard from '../pages/admin/Dashboard';

import CheckinLayout from '../pages/checkin/Layout';
import CheckinPortal from '../pages/checkin/CheckinPortal';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <StudentLayout />,
    children: [
      {
        index: true,
        element: <StudentHome />
      }
    ]
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <AdminDashboard />
      }
    ]
  },
  {
    path: '/checkin',
    element: <CheckinLayout />,
    children: [
      {
        index: true,
        element: <CheckinPortal />
      }
    ]
  }
]);
