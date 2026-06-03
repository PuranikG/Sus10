import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// REACT_APP_BACKEND_URL is set at build time by the hosting platform.
// Fall back to "" (empty string) so API calls become relative paths
// (/api/...) when frontend and backend are served from the same domain.
export const API_URL = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    const detail = error.detail;
    const message = typeof detail === 'string'
      ? detail
      : (detail && detail.message) || 'Request failed';
    const err = new Error(message);
    err.status = response.status;
    err.detail = detail;
    throw err;
  }
  
  return response.json();
}

export function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getAQILevel(aqi) {
  if (aqi <= 50) return { level: 'Good', color: 'text-green-500', bg: 'bg-green-500' };
  if (aqi <= 100) return { level: 'Moderate', color: 'text-yellow-500', bg: 'bg-yellow-500' };
  if (aqi <= 150) return { level: 'Unhealthy for Sensitive', color: 'text-orange-500', bg: 'bg-orange-500' };
  if (aqi <= 200) return { level: 'Unhealthy', color: 'text-red-500', bg: 'bg-red-500' };
  if (aqi <= 300) return { level: 'Very Unhealthy', color: 'text-purple-500', bg: 'bg-purple-500' };
  return { level: 'Hazardous', color: 'text-red-900', bg: 'bg-red-900' };
}

export function getBuildingTypeLabel(type) {
  const labels = {
    it_park: 'IT Park',
    hospital: 'Hospital',
    college: 'College/University',
    residential: 'Residential',
    commercial: 'Commercial',
    industrial: 'Industrial',
  };
  return labels[type] || type;
}

export function getSolutionIcon(category) {
  const icons = {
    greening: 'Leaf',
    energy: 'Sun',
    water: 'Droplets',
    waste: 'Recycle',
  };
  return icons[category] || 'Circle';
}
