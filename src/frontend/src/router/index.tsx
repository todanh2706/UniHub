import { createBrowserRouter } from 'react-router-dom';

import StudentLayout from '../pages/student/Layout';
import StudentHome from '../pages/student/Home';
import WorkshopDetails from '../pages/student/WorkshopDetails';

import AdminLayout from '../pages/admin/Layout';
import AdminDashboard from '../pages/admin/Dashboard';

import CheckinLayout from '../pages/checkin/Layout';
import CheckinPortal from '../pages/checkin/CheckinPortal';
import OrganizerLayout from '../pages/organizer/Layout';
import OrganizerDashboard from '../pages/organizer/Dashboard';
import WorkshopForm from '../pages/organizer/WorkshopForm';
import RegistrationList from '../pages/organizer/RegistrationList';
import LoginPage from '../pages/auth/LoginPage';
import SignUpPage from '../pages/auth/SignUpPage';
import ProtectedRoute from '../components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <StudentLayout />,
    children: [
      {
        index: true,
        element: <StudentHome />
      },
      {
        path: 'workshops/:id',
        element: <WorkshopDetails />
      },
      {
        path: 'my-registrations',
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <div>My Registrations Page</div>
          }
        ]
      }
    ]
  },
  {
    path: '/admin',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <AdminDashboard />
          }
        ]
      }
    ]
  },
  {
    path: '/checkin',
    element: <ProtectedRoute />,
    children: [
      {
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
    path: '/organizer',
    element: <ProtectedRoute />,
    children: [
      {
        element: <OrganizerLayout />,
        children: [
          {
            index: true,
            element: <OrganizerDashboard />
          },
          {
            path: 'workshops/new',
            element: <WorkshopForm />
          },
          {
            path: 'workshops/:id/edit',
            element: <WorkshopForm />
          },
          {
            path: 'workshops/:id/registrations',
            element: <RegistrationList />
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
