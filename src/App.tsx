import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { router } from './router';

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '14px',
            borderRadius: '12px',
          },
        }}
      />
    </>
  );
}

export default App;
