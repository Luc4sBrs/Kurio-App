import { http, HttpResponse, delay, ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { CartLine, NFT, Order, Quote, Wallet } from '../domain'
import { seedNFTs } from './seed'

type Account = { id: string; name: string; email: string; avatar: string; passwordHash: string; joinedAt: string }
type MockState = {
  nfts: NFT[]
  accounts: Account[]
  favorites: Record<string, string[]>
  carts: Record<string, CartLine[]>
  wallets: Record<string, Wallet[]>
  orders: Record<string, Order>
  idempotency: Record<string, string>
  revision: number
  scenario: string
}

const DB_NAME = 'ember-mock-db'
const STORE = 'state'
const KEY = 'marketplace'
let cachedState: MockState | undefined
let cachedPromise: Promise<MockState> | undefined

const demoAccounts: Account[] = [
  { id: 'collector-ava', name: 'Ava Martins', email: 'demo@kurio.art', avatar: 'AM', passwordHash: 'bae292b4552e5128341a1942e01e6ef5e687722181142424b80f87cea93bf113', joinedAt: '2024-04-18T12:00:00.000Z' },
  { id: 'collector-luna', name: 'Luna Costa', email: 'luna@kurio.art', avatar: 'LC', passwordHash: 'c707a7d65952a5512ae0552900a58072ad17eb9c18a4a727ccf4b8f0a118daf2', joinedAt: '2024-10-02T12:00:00.000Z' },
]

function openDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readState(): Promise<MockState | undefined> {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE).objectStore(STORE).get(KEY)
    request.onsuccess = () => resolve(request.result as MockState | undefined)
    request.onerror = () => reject(request.error)
  })
}

async function saveState(state: MockState) {
  const database = await openDB()
  return new Promise<void>((resolve, reject) => {
    const request = database.transaction(STORE, 'readwrite').objectStore(STORE).put(state, KEY)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function state() {
  if (cachedState) return cachedState
  cachedPromise ??= (async () => {
    const stored = await readState()
    cachedState = stored ?? {
      nfts: structuredClone(seedNFTs), accounts: demoAccounts, favorites: { 'collector-ava': ['ember-002', 'ember-006'], 'collector-luna': ['ember-001'] },
      carts: {}, wallets: {
        'collector-ava': [{ id: 'wallet-ava-1', label: 'My MetaMask', address: '0x4b72...a931', network: 'Ethereum', primary: true }],
        'collector-luna': [{ id: 'wallet-luna-1', label: 'Rainbow wallet', address: '0x86c0...21c4', network: 'Base', primary: true }],
      }, orders: {}, idempotency: {}, revision: 1, scenario: new URL(self.location.href).searchParams.get('scenario') ?? 'standard',
    }
    if (!stored) await saveState(cachedState)
    return cachedState
  })()
  return cachedPromise
}

async function persist(current: MockState) {
  current.revision += 1
  cachedState = current
  await saveState(current)
}

const error = (status: number, message: string, code: string) => HttpResponse.json({ error: { message, code } }, { status })
const wait = async (current: MockState, base = 180) => {
  if (current.scenario === 'slow') await delay(1100)
  else if (current.scenario === 'variable') await delay(350 + Math.random() * 700)
  else await delay(base)
}

function bearer(request: Request) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
}
function currentAccount(current: MockState, request: Request) {
  if (current.scenario === 'session-expired') return undefined
  const token = bearer(request)
  return token.startsWith('session-') ? current.accounts.find((account) => `session-${account.id}` === token) : undefined
}
function requireAccount(current: MockState, request: Request) {
  const account = currentAccount(current, request)
  return account ? { account } : { response: error(401, 'Sua sessão expirou. Entre novamente para continuar.', 'SESSION_EXPIRED') }
}
const asCollector = (account: Account) => ({ id: account.id, name: account.name, email: account.email, avatar: account.avatar, joinedAt: account.joinedAt })

const toMicros = (value: string) => {
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole || '0') * 1_000_000n + BigInt((fraction + '000000').slice(0, 6))
}
const fromMicros = (value: bigint) => `${value / 1_000_000n}.${String(value % 1_000_000n).padStart(6, '0').replace(/0+$/, '').padEnd(2, '0')}`
function quote(current: MockState, lines: CartLine[], coupon?: string): Quote {
  const subtotalValue = lines.reduce((sum, line) => {
    const nft = current.nfts.find((item) => item.id === line.nftId)
    return sum + (nft ? toMicros(nft.priceEth) * BigInt(line.quantity) : 0n)
  }, 0n)
  const validCoupon = coupon?.trim().toUpperCase() === 'KURIO10'
  const discountValue = validCoupon ? subtotalValue / 10n : 0n
  const fee = subtotalValue > 0 ? toMicros('0.006') : 0n
  return { subtotal: fromMicros(subtotalValue), discount: fromMicros(discountValue), networkFee: fromMicros(fee), total: fromMicros(subtotalValue - discountValue + fee), coupon: validCoupon ? 'KURIO10' : undefined, version: current.revision }
}

async function digest(password: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

export const apiHandlers = [
  http.get('/api/session', async ({ request }) => {
    const current = await state(); await wait(current, 80)
    const account = currentAccount(current, request)
    return HttpResponse.json({ user: account ? asCollector(account) : null })
  }),
  http.post('/api/session/login', async ({ request }) => {
    const current = await state(); await wait(current)
    if (current.scenario === 'http-error') return error(503, 'O serviço está temporariamente indisponível.', 'SERVICE_UNAVAILABLE')
    const body = await request.json() as { email?: string; password?: string }
    const account = current.accounts.find((item) => item.email.toLowerCase() === body.email?.trim().toLowerCase())
    if (!account || account.passwordHash !== await digest(body.password ?? '')) return error(401, 'E-mail ou senha incorretos.', 'INVALID_CREDENTIALS')
    const guest = current.carts.guest ?? []
    current.carts[account.id] = mergeLines(current.carts[account.id] ?? [], guest)
    delete current.carts.guest
    await persist(current)
    return HttpResponse.json({ user: asCollector(account), token: `session-${account.id}` })
  }),
  http.post('/api/session/register', async ({ request }) => {
    const current = await state(); await wait(current)
    const body = await request.json() as { name?: string; email?: string; password?: string }
    if (!body.name?.trim() || !body.email?.includes('@') || (body.password?.length ?? 0) < 8) return error(422, 'Revise os campos destacados.', 'VALIDATION_ERROR')
    if (current.accounts.some((account) => account.email.toLowerCase() === body.email?.toLowerCase())) return error(409, 'Este e-mail já possui uma conta.', 'EMAIL_CONFLICT')
    const account: Account = { id: `collector-${crypto.randomUUID()}`, name: body.name.trim(), email: body.email.trim(), avatar: body.name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(), passwordHash: await digest(body.password!), joinedAt: new Date().toISOString() }
    current.accounts.push(account); current.carts[account.id] = current.carts.guest ?? []; delete current.carts.guest
    current.favorites[account.id] = []; current.wallets[account.id] = []
    await persist(current)
    return HttpResponse.json({ user: asCollector(account), token: `session-${account.id}` }, { status: 201 })
  }),
  http.post('/api/session/logout', async () => HttpResponse.json({ ok: true })),
  http.get('/api/nfts', async ({ request }) => {
    const current = await state(); await wait(current, 260)
    if (current.scenario === 'http-error') return error(503, 'Não foi possível carregar o catálogo.', 'SERVICE_UNAVAILABLE')
    const url = new URL(request.url)
    const query = (url.searchParams.get('q') ?? '').toLowerCase()
    const category = url.searchParams.get('category') ?? 'All'
    const sort = url.searchParams.get('sort') ?? 'popular'
    const minPrice = Number(url.searchParams.get('minPrice') ?? 0)
    const maxPrice = Number(url.searchParams.get('maxPrice') ?? Number.POSITIVE_INFINITY)
    const availableOnly = url.searchParams.get('available') === 'true'
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
    const pageSize = 12
    const items = current.scenario === 'empty' ? [] : [...current.nfts].filter((nft) => {
      const matches = `${nft.title} ${nft.collection} ${nft.creator}`.toLowerCase().includes(query)
      return matches && (category === 'All' || nft.category === category) && Number(nft.priceEth) >= minPrice && Number(nft.priceEth) <= maxPrice && (!availableOnly || nft.available > 0)
    })
    if (sort === 'price-asc') items.sort((a, b) => Number(a.priceEth) - Number(b.priceEth))
    if (sort === 'price-desc') items.sort((a, b) => Number(b.priceEth) - Number(a.priceEth))
    if (sort === 'newest') items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (sort === 'popular') items.sort((a, b) => b.views - a.views)
    const total = items.length
    return HttpResponse.json({ items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) })
  }),
  http.get('/api/nfts/:id', async ({ params }) => {
    const current = await state(); await wait(current, 180)
    const nft = current.nfts.find((item) => item.id === params.id)
    return nft ? HttpResponse.json({ nft }) : error(404, 'Este colecionável não está disponível.', 'NFT_NOT_FOUND')
  }),
  http.get('/api/favorites', async ({ request }) => {
    const current = await state(); const auth = requireAccount(current, request)
    if (auth.response) return auth.response
    return HttpResponse.json({ ids: current.favorites[auth.account.id] ?? [] })
  }),
  http.post('/api/favorites/:id', async ({ params, request }) => {
    const current = await state(); const auth = requireAccount(current, request); await wait(current, 120)
    if (auth.response) return auth.response
    if (current.scenario === 'mutation-error') return error(503, 'Não foi possível salvar seu favorito.', 'TRANSIENT_FAILURE')
    if (!current.nfts.some((item) => item.id === params.id)) return error(404, 'NFT não encontrado.', 'NFT_NOT_FOUND')
    const ids = current.favorites[auth.account.id] ?? []
    if (!ids.includes(String(params.id))) ids.push(String(params.id))
    current.favorites[auth.account.id] = ids; await persist(current)
    return HttpResponse.json({ ids })
  }),
  http.delete('/api/favorites/:id', async ({ params, request }) => {
    const current = await state(); const auth = requireAccount(current, request)
    if (auth.response) return auth.response
    current.favorites[auth.account.id] = (current.favorites[auth.account.id] ?? []).filter((id) => id !== params.id)
    await persist(current); return HttpResponse.json({ ids: current.favorites[auth.account.id] })
  }),
  http.get('/api/cart', async ({ request }) => {
    const current = await state(); const account = currentAccount(current, request); await wait(current, 180)
    const lines = current.carts[account?.id ?? 'guest'] ?? []
    return HttpResponse.json({ lines, nfts: lines.map((line) => current.nfts.find((nft) => nft.id === line.nftId)).filter(Boolean), quote: quote(current, lines) })
  }),
  http.post('/api/cart', async ({ request }) => {
    const current = await state(); const body = await request.json() as { nftId: string; quantity?: number }; const account = currentAccount(current, request); await wait(current, 120)
    const nft = current.nfts.find((item) => item.id === body.nftId)
    if (!nft) return error(404, 'NFT não encontrado.', 'NFT_NOT_FOUND')
    const key = account?.id ?? 'guest'; const lines = current.carts[key] ?? []
    const existing = lines.find((line) => line.nftId === body.nftId)
    const quantity = existing ? existing.quantity + (body.quantity ?? 1) : (body.quantity ?? 1)
    if (quantity > nft.available) return error(409, `Restam somente ${nft.available} unidades.`, 'INVENTORY_CONFLICT')
    if (existing) existing.quantity = quantity; else lines.push({ nftId: body.nftId, quantity })
    current.carts[key] = lines; await persist(current)
    return HttpResponse.json({ lines, quote: quote(current, lines) }, { status: 201 })
  }),
  http.patch('/api/cart/:id', async ({ params, request }) => {
    const current = await state(); const account = currentAccount(current, request); const body = await request.json() as { quantity: number }
    const key = account?.id ?? 'guest'; const lines = current.carts[key] ?? []; const line = lines.find((item) => item.nftId === params.id)
    const nft = current.nfts.find((item) => item.id === params.id)
    if (!line || !nft) return error(404, 'Item não encontrado no carrinho.', 'CART_LINE_NOT_FOUND')
    if (!Number.isInteger(body.quantity) || body.quantity < 1) return error(422, 'A quantidade deve ser pelo menos 1.', 'VALIDATION_ERROR')
    if (body.quantity > nft.available) return error(409, `Restam somente ${nft.available} unidades.`, 'INVENTORY_CONFLICT')
    line.quantity = body.quantity; await persist(current)
    return HttpResponse.json({ lines, quote: quote(current, lines) })
  }),
  http.delete('/api/cart/:id', async ({ params, request }) => {
    const current = await state(); const key = currentAccount(current, request)?.id ?? 'guest'
    current.carts[key] = (current.carts[key] ?? []).filter((line) => line.nftId !== params.id)
    await persist(current); return HttpResponse.json({ lines: current.carts[key], quote: quote(current, current.carts[key]) })
  }),
  http.post('/api/quote', async ({ request }) => {
    const current = await state(); const body = await request.json() as { lines: CartLine[]; coupon?: string }; await wait(current, 160)
    if (body.coupon && body.coupon.toUpperCase() !== 'KURIO10') return error(422, 'Cupom inválido ou expirado.', 'COUPON_INVALID')
    const unavailable = body.lines.find((line) => (current.nfts.find((nft) => nft.id === line.nftId)?.available ?? 0) < line.quantity)
    if (unavailable) return error(409, 'A disponibilidade de um item mudou. Atualize o carrinho.', 'INVENTORY_CONFLICT')
    return HttpResponse.json({ quote: quote(current, body.lines, body.coupon) })
  }),
  http.get('/api/profile', async ({ request }) => {
    const current = await state(); const auth = requireAccount(current, request)
    return auth.response ?? HttpResponse.json({ user: asCollector(auth.account) })
  }),
  http.patch('/api/profile', async ({ request }) => {
    const current = await state(); const auth = requireAccount(current, request); if (auth.response) return auth.response
    const body = await request.json() as { name?: string; avatar?: string }
    if (!body.name?.trim()) return error(422, 'Informe seu nome.', 'VALIDATION_ERROR')
    const account = current.accounts.find((item) => item.id === auth.account.id)!
    account.name = body.name.trim(); account.avatar = body.avatar?.slice(0, 2).toUpperCase() || account.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    await persist(current); return HttpResponse.json({ user: asCollector(account) })
  }),
  http.post('/api/profile/password', async ({ request }) => {
    const current = await state(); const auth = requireAccount(current, request); if (auth.response) return auth.response
    const body = await request.json() as { currentPassword?: string; password?: string }
    if ((body.password?.length ?? 0) < 8) return error(422, 'Use pelo menos 8 caracteres.', 'VALIDATION_ERROR')
    const account = current.accounts.find((item) => item.id === auth.account.id)!
    if (account.passwordHash !== await digest(body.currentPassword ?? '')) return error(422, 'A senha atual não confere.', 'CURRENT_PASSWORD_INVALID')
    account.passwordHash = await digest(body.password!); await persist(current); return HttpResponse.json({ ok: true })
  }),
  http.get('/api/wallets', async ({ request }) => {
    const current = await state(); const auth = requireAccount(current, request)
    return auth.response ?? HttpResponse.json({ wallets: current.wallets[auth.account.id] ?? [] })
  }),
  http.post('/api/wallets', async ({ request }) => {
    const current = await state(); const auth = requireAccount(current, request); if (auth.response) return auth.response
    const body = await request.json() as { label?: string; address?: string; network?: string }
    if (!body.label?.trim() || !/^0x[a-fA-F0-9]{40}$/.test(body.address ?? '')) return error(422, 'Informe um nome e um endereço de carteira válido.', 'VALIDATION_ERROR')
    const wallets = current.wallets[auth.account.id] ?? []
    const wallet: Wallet = { id: crypto.randomUUID(), label: body.label.trim(), address: `${body.address!.slice(0, 6)}...${body.address!.slice(-4)}`, network: body.network ?? 'Ethereum', primary: wallets.length === 0 }
    wallets.push(wallet); current.wallets[auth.account.id] = wallets; await persist(current)
    return HttpResponse.json({ wallet }, { status: 201 })
  }),
  http.patch('/api/wallets/:id', async ({ params, request }) => {
    const current = await state(); const auth = requireAccount(current, request); if (auth.response) return auth.response
    const body = await request.json() as Partial<Wallet>; const wallets = current.wallets[auth.account.id] ?? []; const target = wallets.find((wallet) => wallet.id === params.id)
    if (!target) return error(404, 'Carteira não encontrada.', 'WALLET_NOT_FOUND')
    if (body.primary) wallets.forEach((wallet) => { wallet.primary = wallet.id === target.id })
    if (body.label?.trim()) target.label = body.label.trim()
    if (body.network) target.network = body.network
    await persist(current); return HttpResponse.json({ wallets })
  }),
  http.post('/api/orders', async ({ request }) => {
    const current = await state(); const auth = requireAccount(current, request); if (auth.response) return auth.response
    const idempotencyKey = request.headers.get('idempotency-key')
    if (!idempotencyKey) return error(400, 'Chave de tentativa ausente.', 'IDEMPOTENCY_KEY_REQUIRED')
    const body = await request.json() as { lines: CartLine[]; coupon?: string; walletId?: string; quoteVersion?: number }
    const fingerprint = JSON.stringify(body)
    const existingId = current.idempotency[idempotencyKey]
    if (existingId) {
      const existing = current.orders[existingId]
      if ((existing as Order & { fingerprint?: string }).fingerprint !== fingerprint) return error(409, 'Esta chave já foi usada com outro pedido.', 'IDEMPOTENCY_CONFLICT')
      return HttpResponse.json({ order: existing })
    }
    await wait(current, 230)
    const unavailable = body.lines.find((line) => (current.nfts.find((nft) => nft.id === line.nftId)?.available ?? 0) < line.quantity)
    if (unavailable) return error(409, 'Um item acabou de esgotar. Revise sua compra.', 'INVENTORY_CONFLICT')
    if (body.coupon && body.coupon !== 'KURIO10') return error(422, 'O cupom expirou. Revise os valores.', 'COUPON_INVALID')
    const updatedPrice = body.quoteVersion !== undefined && body.quoteVersion < current.revision
    if (updatedPrice) return error(409, 'O preço mudou desde sua última cotação. Revise os valores.', 'QUOTE_STALE')
    const currentQuote = quote(current, body.lines, body.coupon)
    const items = body.lines.map((line) => structuredClone(current.nfts.find((nft) => nft.id === line.nftId)!))
    const order: Order & { fingerprint?: string; ownerId?: string } = {
      id: `EM-${Date.now().toString(36).toUpperCase()}`, status: current.scenario === 'payment-declined' ? 'declined' : 'pending', lines: structuredClone(body.lines), items, quote: currentQuote,
      transaction: `0x${crypto.randomUUID().replaceAll('-', '')}`, createdAt: new Date().toISOString(), fingerprint, ownerId: auth.account.id,
    }
    current.orders[order.id] = order; current.idempotency[idempotencyKey] = order.id
    if (order.status === 'pending' && current.scenario !== 'timeout') {
      order.status = 'confirmed'
      body.lines.forEach((line) => { const nft = current.nfts.find((item) => item.id === line.nftId); if (nft) nft.available -= line.quantity })
      const lines = current.carts[auth.account.id] ?? []
      current.carts[auth.account.id] = lines.filter((line) => !body.lines.some((bought) => bought.nftId === line.nftId))
    }
    await persist(current)
    if (current.scenario === 'timeout') return error(504, 'A conexão caiu após o envio. Consulte o pedido para recuperar o resultado.', 'ORDER_TIMEOUT')
    return HttpResponse.json({ order }, { status: 201 })
  }),
  http.get('/api/orders/:id', async ({ params, request }) => {
    const current = await state(); const auth = requireAccount(current, request); if (auth.response) return auth.response
    const order = current.orders[String(params.id)]
    return order ? HttpResponse.json({ order }) : error(404, 'Pedido não encontrado.', 'ORDER_NOT_FOUND')
  }),
  http.post('/api/scenarios/reset', async ({ request }) => {
    const body = await request.json().catch(() => ({})) as { scenario?: string }
    const clean: MockState = { nfts: structuredClone(seedNFTs), accounts: demoAccounts, favorites: { 'collector-ava': ['ember-002', 'ember-006'], 'collector-luna': ['ember-001'] }, carts: {}, wallets: { 'collector-ava': [{ id: 'wallet-ava-1', label: 'My MetaMask', address: '0x4b72...a931', network: 'Ethereum', primary: true }], 'collector-luna': [{ id: 'wallet-luna-1', label: 'Rainbow wallet', address: '0x86c0...21c4', network: 'Base', primary: true }] }, orders: {}, idempotency: {}, revision: 1, scenario: body.scenario ?? 'standard' }
    await persist(clean)
    return HttpResponse.json({ ok: true, scenario: clean.scenario })
  }),
  http.post('/api/scenarios/:name', async ({ params }) => {
    const current = await state(); current.scenario = String(params.name); await persist(current)
    return HttpResponse.json({ ok: true, scenario: current.scenario })
  }),
]

function mergeLines(first: CartLine[], second: CartLine[]) {
  const output = structuredClone(first)
  second.forEach((line) => { const existing = output.find((item) => item.nftId === line.nftId); if (existing) existing.quantity += line.quantity; else output.push(structuredClone(line)) })
  return output
}

const socketUrl = new URL(window.location.origin)
socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:'
// MSW normalizes Socket.IO's /socket.io/ transport path to the origin path.
socketUrl.pathname = '/'
socketUrl.search = ''
const socket = ws.link(socketUrl.href)
const socketHandler = socket.addEventListener('connection', (connection) => {
  const { client } = toSocketIo(connection)
  client.on('session:join', (_event, userId: string) => { client.emit('session:ready', { userId, at: Date.now() }) })
  client.on('scenario:price', async (_event, nftId: string) => {
    const current = await state(); const nft = current.nfts.find((item) => item.id === nftId)
    if (!nft) return
    nft.priceEth = (Number(nft.priceEth) + 0.07).toFixed(2); nft.version += 1
    await persist(current)
    client.emit('nft.updated', { id: nft.id, nft: structuredClone(nft), version: nft.version, updatedAt: new Date().toISOString() })
  })
  client.on('scenario:inventory', async (_event, nftId: string, available: number) => {
    const current = await state(); const nft = current.nfts.find((item) => item.id === nftId)
    if (!nft) return
    nft.available = Math.max(0, available); nft.version += 1
    await persist(current)
    client.emit('nft.updated', { id: nft.id, nft: structuredClone(nft), version: nft.version, updatedAt: new Date().toISOString() })
  })
  client.on('scenario:duplicate', async (_event, nftId: string) => {
    const current = await state(); const nft = current.nfts.find((item) => item.id === nftId)
    if (!nft) return
    nft.priceEth = (Number(nft.priceEth) + 0.07).toFixed(2); nft.version += 1
    await persist(current)
    const event = { id: nft.id, nft: structuredClone(nft), version: nft.version, updatedAt: new Date().toISOString() }
    client.emit('nft.updated', event)
    client.emit('nft.updated', event)
    client.emit('nft.updated', { ...event, version: nft.version - 1, nft: { ...event.nft, priceEth: (Number(event.nft.priceEth) + 1).toFixed(2) } })
  })
  client.on('scenario:order', async (_event, orderId: string, status: 'confirmed' | 'declined') => {
    const current = await state(); const order = current.orders[orderId]
    if (!order || order.status !== 'pending') return
    order.status = status
    if (status === 'confirmed') {
      order.lines.forEach((line) => { const nft = current.nfts.find((item) => item.id === line.nftId); if (nft) nft.available = Math.max(0, nft.available - line.quantity) })
      const ownerId = (order as Order & { ownerId?: string }).ownerId
      if (ownerId) current.carts[ownerId] = (current.carts[ownerId] ?? []).filter((line) => !order.lines.some((bought) => bought.nftId === line.nftId))
    }
    await persist(current)
    client.emit('order.updated', { id: order.id, order: structuredClone(order), version: current.revision })
  })
})

export const handlers = [...apiHandlers, socketHandler]

