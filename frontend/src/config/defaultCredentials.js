/** Default demo accounts seeded by the backend on startup (see backend/main.py). */
export const DEFAULT_CREDENTIALS = {
  admin: { email: 'admin@example.com', password: 'admin123', label: 'Admin' },
  analyst: { email: 'analyst@example.com', password: 'analyst123', label: 'Analyst' },
  customer: { email: 'customer@example.com', password: 'customer123', label: 'Customer' },
}

export const DEFAULT_CREDENTIAL_LIST = Object.values(DEFAULT_CREDENTIALS)
