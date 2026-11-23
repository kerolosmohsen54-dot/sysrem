import type { NavigationKey } from '../i18n/ar';

type IconName = NavigationKey | 'home' | 'grid' | 'menu' | 'logout' | 'search' | 'bell';

const paths: Record<IconName, string> = {
  dashboard: 'M3 3h8v8H3z M13 3h8v5h-8z M13 10h8v11h-8z M3 13h8v8H3z',
  categories: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  customers:
    'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6 M23 11h-6',
  orders: 'M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5',
  deliveries:
    'M3 5h12v12H3z M15 9h4l3 4v4h-7z M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
  invoices: 'M6 2h9l5 5v15H6z M14 2v6h6 M9 13h8 M9 17h8',
  collections: 'M3 6h18v13H3z M7 10h10 M7 14h5 M7 3v6 M17 3v6',
  returns: 'M4 7h12a4 4 0 0 1 0 8H8 M8 11l-4 4 4 4 M20 5v4',
  products: 'M12 2 21 7v10l-9 5-9-5V7z M3 7l9 5 9-5 M12 12v10',
  inventory: 'M3 7 12 2l9 5-9 5z M3 7v10l9 5 9-5V7 M12 12v10',
  inventoryMovements: 'M4 7h13l-3-3 M20 17H7l3 3 M17 4l3 3-3 3 M7 14l-3 3 3 3',
  inventoryAdjustments: 'M12 3v18 M3 12h18 M5 5l14 14 M19 5 5 19',
  openingStock: 'M4 17h16 M6 13l6-8 6 8 M12 5v12',
  inventoryTransfers: 'M4 8h14l-3-3 M20 16H6l3 3',
  damagedStock: 'M12 3v8 M12 15v2 M4 20h16L12 3z',
  warehouses: 'M3 20h18 M5 20V8l7-5 7 5v12 M9 20v-6h6v6',
  finance: 'M3 5h18v14H3z M7 9h5 M7 13h3 M15 13h3',
  containers: 'M3 7h18v13H3z M3 11h18 M8 7v13 M16 7v13 M6 4h12',
  reports: 'M4 19V5 M4 19h17 M8 16v-5 M13 16V7 M18 16v-9',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6 M23 11h-6',
  audit: 'M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 2.9-.2-.1a1.7 1.7 0 0 0-1.8.5l-.1.2h-3.4l-.1-.2a1.7 1.7 0 0 0-1.8-.5l-.2.1-1.7-2.9.1-.1a1.7 1.7 0 0 0 .3-1.9l-.1-.2v-3.4l.1-.2a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.7-2.9.2.1a1.7 1.7 0 0 0 1.8-.5l.1-.2h3.4l.1.2a1.7 1.7 0 0 0 1.8.5l.2-.1 1.7 2.9-.1.1a1.7 1.7 0 0 0-.3 1.9l.1.2v3.4z',
  home: 'm3 10 9-7 9 7v10h-6v-6H9v6H3z',
  grid: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
  menu: 'M3 6h18 M3 12h18 M3 18h18',
  logout: 'M10 17l5-5-5-5 M15 12H3 M21 3v18',
  search: 'm20 20-4.5-4.5 M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
};

export function Icon({ name }: { name: IconName }) {
  const path = name === 'dashboard' ? paths.home : paths[name];
  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    >
      <path d={path} />
    </svg>
  );
}
