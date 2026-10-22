import { useEffect, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from '@/app/store';
import { useAppDispatch } from '@/app/hooks';
import { initializeAuth } from '@/features/auth/store/authSlice';

interface AuthInitializerProps {
  children: ReactNode;
}

function AuthInitializer({ children }: AuthInitializerProps) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(initializeAuth());
  }, [dispatch]);

  return children;
}

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthInitializer>{children}</AuthInitializer>
      </BrowserRouter>
    </Provider>
  );
}
