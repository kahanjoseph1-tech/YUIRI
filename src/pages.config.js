/**
 * pages.config.js - Page routing configuration
 *
 * Pages are registered here and routed by App.jsx as /<PageKey>.
 * Detail pages use a query param (e.g. /ClientDetail?id=...).
 *
 * THE ONLY EDITABLE VALUE for the landing page is `mainPage`.
 */
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Appointments from './pages/Appointments';
import Evaluations from './pages/Evaluations';
import Schools from './pages/Schools';
import Placements from './pages/Placements';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Clients": Clients,
    "ClientDetail": ClientDetail,
    "Appointments": Appointments,
    "Evaluations": Evaluations,
    "Schools": Schools,
    "Placements": Placements,
    "Billing": Billing,
    "Reports": Reports,
    "Users": Users,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
