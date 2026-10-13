import type { Socket } from 'socket.io-client'
import type { NFT } from '../domain'
import { waitForMockReadiness } from './mock-readiness'

export type PriceEvent = { id: string; nft: NFT; version: number; updatedAt: string }
export type OrderEvent = { id: string; order: { id: string; status: 'confirmed' | 'declined' }; version: number }

let activeSocket: Socket | undefined

export async function connectMarketplaceSocket(userId?: string) {
  // Load after MSW starts so its WebSocket interceptor patches the constructor first.
  await waitForMockReadiness()
  const { io } = await import('socket.io-client')
  const socket = io(window.location.origin, { path: '/socket.io/', transports: ['websocket'], reconnectionAttempts: 5, reconnectionDelay: 500 })
  activeSocket = socket
  socket.on('connect', () => { if (userId) socket.emit('session:join', userId) })
  return socket
}

export function disconnectMarketplaceSocket(socket?: Socket) {
  socket?.disconnect()
  if (activeSocket === socket) activeSocket = undefined
}

export function emitScenario(event: 'scenario:price', nftId: string): void
export function emitScenario(event: 'scenario:inventory', nftId: string, available: number): void
export function emitScenario(event: 'scenario:order', orderId: string, status: 'confirmed' | 'declined'): void
export function emitScenario(event: 'scenario:duplicate', nftId: string): void
export function emitScenario(event: string, ...args: unknown[]) { activeSocket?.emit(event, ...args) }

