import { render, type RenderOptions } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContext';

interface WrapperProps {
  children: ReactNode;
}

function AllProviders({ children }: WrapperProps) {
  return (
    <BrowserRouter>
      <AuthProvider>{children}</AuthProvider>
    </BrowserRouter>
  );
}

function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

interface MemoryRouterWrapperOptions {
  initialEntries?: string[];
}

function createMemoryRouterWrapper({ initialEntries = ['/'] }: MemoryRouterWrapperOptions = {}) {
  return function MemoryRouterWrapper({ children }: WrapperProps) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    );
  };
}

function renderWithMemoryRouter(
  ui: ReactElement,
  { initialEntries = ['/'], ...options }: Omit<RenderOptions, 'wrapper'> & MemoryRouterWrapperOptions = {}
) {
  return render(ui, {
    wrapper: createMemoryRouterWrapper({ initialEntries }),
    ...options,
  });
}

export { renderWithProviders, renderWithMemoryRouter, createMemoryRouterWrapper };
export { render };
