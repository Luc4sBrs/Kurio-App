export type Category = 'All' | 'Art' | 'Collectible' | 'PFP' | 'Photography'
export type SortKey = 'popular' | 'newest' | 'price-asc' | 'price-desc'

export type NFT = {
  id: string
  title: string
  collection: string
  creator: string
  category: Exclude<Category, 'All'>
  priceEth: string
  available: number
  editionSize: number
  views: number
  art: string
  featured?: boolean
  version: number
  createdAt: string
}

export type Collector = { id: string; name: string; email: string; avatar: string; joinedAt: string }
export type Wallet = { id: string; label: string; address: string; network: string; primary: boolean }
export type CartLine = { nftId: string; quantity: number }
export type Quote = { subtotal: string; discount: string; networkFee: string; total: string; coupon?: string; version: number }
export type OrderStatus = 'pending' | 'confirmed' | 'declined'
export type Order = { id: string; status: OrderStatus; lines: CartLine[]; items: NFT[]; quote: Quote; transaction: string; createdAt: string }

export type PageResult<T> = { items: T[]; page: number; pageSize: number; total: number; pages: number }
