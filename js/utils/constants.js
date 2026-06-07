/**
 * SISPAGER-GRD - Constants
 * Core application constants and configuration values
 */

export const APP_NAME = 'SISPAGER-GRD';
export const APP_VERSION = '1.0.0';
export const APP_SUBTITLE = 'Sistema de Gestión de Lecciones Aprendidas';
export const RECORDS_PER_PAGE = 15;

export const ROLES = { ADMIN: 'admin', COLLABORATOR: 'collaborator' };

import { REGIONS as dynRegions, LOCATIONS } from './locations.js';

export const REGIONS = dynRegions;

export const SUBPROCESSES = [
  { id: 'conduccion', label: 'Conducción de emergencias', color: '#3B82F6' },
  { id: 'edan', label: 'Evaluación de daños (EDAN)', color: '#10B981' },
  { id: 'asistencia', label: 'Asistencia humanitaria', color: '#F59E0B' },
  { id: 'rehabilitacion', label: 'Rehabilitación', color: '#8B5CF6' },
  { id: 'preparacion', label: 'Preparación', color: '#EC4899' },
  { id: 'estimacion', label: 'Estimación de riesgo', color: '#6366F1' },
  { id: 'prevencion', label: 'Prevención', color: '#14B8A6' },
  { id: 'reduccion', label: 'Reducción de riesgo', color: '#F43F5E' },
  { id: 'reconstruccion', label: 'Reconstrucción', color: '#06B6D4' }
];

export const SUBPROCESS_COLORS = SUBPROCESSES.reduce((acc, curr) => {
  acc[curr.id] = curr.color;
  return acc;
}, {});


/**
 * Real provinces for each of the 25 regions of Peru.
 * Generated dynamically from the locations database.
 */
export const PROVINCES = {};
for (const region of REGIONS) {
  PROVINCES[region] = Object.keys(LOCATIONS[region] || {});
}

export { LOCATIONS };

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { id: 'form', label: 'Nuevo Registro', icon: 'file-plus' },
  { id: 'explorer', label: 'Explorador', icon: 'database' },
  { id: 'reports', label: 'Reportes', icon: 'bar-chart-3' },
  { id: 'admin', label: 'Usuarios', icon: 'users', adminOnly: true }
];
