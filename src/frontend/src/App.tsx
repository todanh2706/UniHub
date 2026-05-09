import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import NetworkStatusToast from './components/common/NetworkStatusToast';
import SyncManager from './components/common/SyncManager';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkStatusToast />
      <SyncManager />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
