import axios from 'axios'

const api = axios.create({
  // During local development Vite proxies /api to FastAPI. In production,
  // set VITE_API_URL to the public FastAPI URL (for example,
  // https://enterprise-api.onrender.com).
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Auto-attach token from localStorage on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('eip_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('eip_token')
      delete api.defaults.headers.common['Authorization']
      window.dispatchEvent(new CustomEvent('eip-auth-expired'))
    }
    return Promise.reject(error)
  }
)

export default api
