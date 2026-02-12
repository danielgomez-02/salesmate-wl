/**
 * Component tests for components/Layout.tsx
 *
 * Covers:
 * - A11Y-001: ARIA labels, roles, aria-current
 * - Navigation rendering: pre-login vs post-login
 * - Back button visibility
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Layout from '../components/Layout';
import { AppScreen } from '../types';
import { BrandProvider } from '../context/BrandContext';

// ── Wrapper that provides BrandContext ──

function renderWithBrand(ui: React.ReactElement) {
  return render(
    <BrandProvider>{ui}</BrandProvider>
  );
}

function makeLayout(props: Partial<React.ComponentProps<typeof Layout>> = {}) {
  const defaults = {
    activeScreen: AppScreen.DASHBOARD,
    setScreen: vi.fn(),
    title: 'Test Screen',
    showNav: true,
  };
  return <Layout {...defaults} {...props}><div data-testid="content">Content</div></Layout>;
}

// ── Tests ──

describe('Layout', () => {
  // ────────────────────────────────────────────
  // A11Y-001: ARIA roles and labels
  // ────────────────────────────────────────────
  describe('A11Y-001: ARIA accessibility', () => {
    it('renders header with role="banner"', () => {
      renderWithBrand(makeLayout());
      const header = document.querySelector('[role="banner"]');
      expect(header).not.toBeNull();
    });

    it('renders main content with role="main"', () => {
      renderWithBrand(makeLayout());
      const main = document.querySelector('[role="main"]');
      expect(main).not.toBeNull();
    });

    it('renders nav with role="navigation" and aria-label', () => {
      renderWithBrand(makeLayout({ activeScreen: AppScreen.DASHBOARD }));
      const nav = document.querySelector('nav[role="navigation"]');
      expect(nav).not.toBeNull();
      expect(nav!.getAttribute('aria-label')).toBe('Navegación principal');
    });

    it('back button has aria-label="Volver atrás"', () => {
      renderWithBrand(makeLayout({ activeScreen: AppScreen.ROUTE }));
      const backButton = screen.getByLabelText('Volver atrás');
      expect(backButton).toBeInTheDocument();
    });

    it('decorative SVGs have aria-hidden="true"', () => {
      renderWithBrand(makeLayout({ activeScreen: AppScreen.DASHBOARD }));
      const svgs = document.querySelectorAll('svg[aria-hidden="true"]');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('active nav button has aria-current="page"', () => {
      renderWithBrand(makeLayout({ activeScreen: AppScreen.DASHBOARD }));
      const activeButton = document.querySelector('[aria-current="page"]');
      expect(activeButton).not.toBeNull();
    });

    it('inactive nav button does NOT have aria-current', () => {
      renderWithBrand(makeLayout({ activeScreen: AppScreen.DASHBOARD }));
      // Profile button should not be active when on Dashboard
      const profileButton = screen.getByLabelText('Ir a Perfil');
      expect(profileButton.getAttribute('aria-current')).toBeNull();
    });

    it('nav buttons have descriptive aria-labels', () => {
      renderWithBrand(makeLayout({ activeScreen: AppScreen.DASHBOARD }));
      const profileBtn = screen.getByLabelText('Ir a Perfil');
      expect(profileBtn).toBeInTheDocument();
    });
  });

  // ────────────────────────────────────────────
  // Navigation visibility
  // ────────────────────────────────────────────
  describe('navigation visibility', () => {
    it('shows navigation on post-login screens', () => {
      renderWithBrand(makeLayout({ activeScreen: AppScreen.DASHBOARD }));
      const nav = document.querySelector('nav');
      expect(nav).not.toBeNull();
    });

    it('hides navigation on pre-login screens (LOGIN)', () => {
      renderWithBrand(makeLayout({ activeScreen: AppScreen.LOGIN }));
      const nav = document.querySelector('nav');
      expect(nav).toBeNull();
    });

    it('hides navigation on LANDING screen', () => {
      renderWithBrand(makeLayout({ activeScreen: AppScreen.LANDING }));
      const nav = document.querySelector('nav');
      expect(nav).toBeNull();
    });

    it('hides navigation when showNav is false', () => {
      renderWithBrand(makeLayout({ activeScreen: AppScreen.DASHBOARD, showNav: false }));
      const nav = document.querySelector('nav');
      expect(nav).toBeNull();
    });
  });

  // ────────────────────────────────────────────
  // Back button
  // ────────────────────────────────────────────
  describe('back button', () => {
    it('hides back button on DASHBOARD', () => {
      renderWithBrand(makeLayout({ activeScreen: AppScreen.DASHBOARD }));
      const backButton = screen.queryByLabelText('Volver atrás');
      expect(backButton).toBeNull();
    });

    it('hides back button on LANDING', () => {
      renderWithBrand(makeLayout({ activeScreen: AppScreen.LANDING }));
      const backButton = screen.queryByLabelText('Volver atrás');
      expect(backButton).toBeNull();
    });

    it('shows back button on ROUTE screen', () => {
      renderWithBrand(makeLayout({ activeScreen: AppScreen.ROUTE }));
      const backButton = screen.getByLabelText('Volver atrás');
      expect(backButton).toBeInTheDocument();
    });

    it('calls onBack when back button is clicked', () => {
      const onBack = vi.fn();
      renderWithBrand(makeLayout({ activeScreen: AppScreen.ROUTE, onBack }));
      fireEvent.click(screen.getByLabelText('Volver atrás'));
      expect(onBack).toHaveBeenCalledOnce();
    });

    it('calls default setScreen(DASHBOARD) when no onBack provided', () => {
      const setScreen = vi.fn();
      renderWithBrand(makeLayout({ activeScreen: AppScreen.ROUTE, setScreen }));
      fireEvent.click(screen.getByLabelText('Volver atrás'));
      expect(setScreen).toHaveBeenCalledWith(AppScreen.DASHBOARD);
    });
  });

  // ────────────────────────────────────────────
  // Nav button actions
  // ────────────────────────────────────────────
  describe('nav button actions', () => {
    it('clicking profile nav button calls setScreen(PROFILE)', () => {
      const setScreen = vi.fn();
      renderWithBrand(makeLayout({ activeScreen: AppScreen.DASHBOARD, setScreen }));
      fireEvent.click(screen.getByLabelText('Ir a Perfil'));
      expect(setScreen).toHaveBeenCalledWith(AppScreen.PROFILE);
    });
  });

  // ────────────────────────────────────────────
  // Content rendering
  // ────────────────────────────────────────────
  describe('content rendering', () => {
    it('renders children in main area', () => {
      renderWithBrand(makeLayout());
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('displays title in header', () => {
      renderWithBrand(makeLayout({ title: 'Mi Ruta' }));
      expect(screen.getByText('Mi Ruta')).toBeInTheDocument();
    });
  });
});
