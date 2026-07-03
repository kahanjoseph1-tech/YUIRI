/**
 * pages.config.js - Page routing configuration
 *
 * Pages are registered here and routed by App.jsx as /<PageKey>.
 * Detail pages use a query param (e.g. /ClientDetail?id=...).
 *
 * THE ONLY EDITABLE VALUE for the landing page is `mainPage`.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": lazy(() => import('./pages/Dashboard')),
    "Clients": lazy(() => import('./pages/Clients')),
    "ClientDetail": lazy(() => import('./pages/ClientDetail')),
    "Appointments": lazy(() => import('./pages/Appointments')),
    "Evaluations": lazy(() => import('./pages/Evaluations')),
    "OpenCases": lazy(() => import('./pages/OpenCases')),
    "Schools": lazy(() => import('./pages/Schools')),
    "Placements": lazy(() => import('./pages/Placements')),
    "Billing": lazy(() => import('./pages/Billing')),
    "Financials": lazy(() => import('./pages/Financials')),
    "Users": lazy(() => import('./pages/Users')),
    "Settings": lazy(() => import('./pages/Settings')),
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
