import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
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
