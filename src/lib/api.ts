import axios from 'axios'
import type { CartLine, Collector, NFT, Order, PageResult, Quote, Wallet } from '../domain'
import { waitForMockReadiness } from './mock-readiness'

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 12_000 })
export const TOKEN_KEY = 'ember-session-token'
export const getToken = () => localStorage.getItem(TOKEN_KEY)

api.interceptors.request.use(async (config) => {
  await waitForMockReadiness()
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use((response) => response, (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401 && error.response.data?.error?.code === 'SESSION_EXPIRED') {
    window.dispatchEvent(new Event('ember:session-expired'))
  }
  return Promise.reject(error)
})

export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) return error.response?.data?.error?.message ?? (error.code === 'ECONNABORTED' ? 'A conexão demorou mais do que o esperado.' : 'Não foi possível conectar. Tente novamente.')
  return 'Algo deu errado. Tente novamente.'
}

export type CatalogSearch = { q: string; category: string; sort: string; page: number; minPrice?: string; maxPrice?: string; available?: boolean }
export type CartResult = { lines: CartLine[]; nfts: NFT[]; quote: Quote }

export const service = {
  session: async () => (await api.get<{ user: Collector | null }>('/session')).data,
  login: async (email: string, password: string) => (await api.post<{ user: Collector; token: string }>('/session/login', { email, password })).data,
  register: async (name: string, email: string, password: string) => (await api.post<{ user: Collector; token: string }>('/session/register', { name, email, password })).data,
  logout: async () => (await api.post('/session/logout')).data,
  catalog: async (search: CatalogSearch, signal?: AbortSignal) => (await api.get<PageResult<NFT>>('/nfts', { params: search, signal })).data,
  nft: async (id: string) => (await api.get<{ nft: NFT }>(`/nfts/${id}`)).data.nft,
  favorites: async () => (await api.get<{ ids: string[] }>('/favorites')).data.ids,
  favorite: async (id: string, active: boolean) => (await api.request<{ ids: string[] }>({ url: `/favorites/${id}`, method: active ? 'POST' : 'DELETE' })).data.ids,
  cart: async () => {
    const data = (await api.get<CartResult>('/cart')).data
    if (!data || !Array.isArray(data.lines)) throw new Error('Resposta inválida de /api/cart (a API ou os mocks não estão ativos?)')
    return data
  },
  addToCart: async (nftId: string, quantity = 1) => (await api.post('/cart', { nftId, quantity })).data,
  setQuantity: async (nftId: string, quantity: number) => (await api.patch(`/cart/${nftId}`, { quantity })).data,
  removeFromCart: async (nftId: string) => (await api.delete(`/cart/${nftId}`)).data,
  quote: async (lines: CartLine[], coupon?: string) => (await api.post<{ quote: Quote }>('/quote', { lines, coupon })).data.quote,
  profile: async () => (await api.get<{ user: Collector }>('/profile')).data.user,
  updateProfile: async (name: string, avatar?: string) => (await api.patch<{ user: Collector }>('/profile', { name, avatar })).data.user,
  changePassword: async (currentPassword: string, password: string) => api.post('/profile/password', { currentPassword, password }),
  wallets: async () => (await api.get<{ wallets: Wallet[] }>('/wallets')).data.wallets,
  addWallet: async (wallet: { label: string; address: string; network: string }) => (await api.post<{ wallet: Wallet }>('/wallets', wallet)).data.wallet,
  setPrimaryWallet: async (id: string) => (await api.patch(`/wallets/${id}`, { primary: true })).data,
  createOrder: async (body: { lines: CartLine[]; coupon?: string; walletId?: string; quoteVersion?: number }, key: string) => (await api.post<{ order: Order }>('/orders', body, { headers: { 'Idempotency-Key': key } })).data.order,
  order: async (id: string) => (await api.get<{ order: Order }>(`/orders/${id}`)).data.order,
  setScenario: async (scenario: string) => api.post(`/scenarios/${scenario}`),
  reset: async () => api.post('/scenarios/reset', { scenario: 'standard' }),
}
