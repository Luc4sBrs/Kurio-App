import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CatalogSearch } from './api'
import { getToken, service } from './api'

export const authScope = () => getToken() ?? 'guest'
export const keys = {
  session: ['session'] as const,
  catalog: (search: CatalogSearch) => ['catalog', search] as const,
  nft: (id: string) => ['nft', id] as const,
  cart: () => ['cart', authScope()] as const,
  favorites: () => ['favorites', authScope()] as const,
  profile: () => ['profile', authScope()] as const,
  wallets: () => ['wallets', authScope()] as const,
  order: (id: string) => ['order', id, authScope()] as const,
  quote: (lines: unknown, coupon: string) => ['quote', authScope(), lines, coupon] as const,
}

export function useSession() {
  return useQuery({ queryKey: keys.session, queryFn: service.session, retry: false, staleTime: 30_000 })
}
export function useCatalog(search: CatalogSearch) {
  return useQuery({ queryKey: keys.catalog(search), queryFn: ({ signal }) => service.catalog(search, signal), placeholderData: (previous) => previous, staleTime: 15_000 })
}
export function useNFT(id: string) {
  return useQuery({ queryKey: keys.nft(id), queryFn: () => service.nft(id), staleTime: 30_000 })
}
export function useCart() {
  return useQuery({ queryKey: keys.cart(), queryFn: service.cart, staleTime: 8_000 })
}
export function useQuote(lines: { nftId: string; quantity: number }[], coupon: string) {
  return useQuery({ queryKey: keys.quote(lines, coupon), queryFn: () => service.quote(lines, coupon || undefined), enabled: lines.length > 0, staleTime: 0 })
}
export function useFavorites(enabled: boolean) {
  return useQuery({ queryKey: keys.favorites(), queryFn: service.favorites, enabled, staleTime: 15_000 })
}
export function useToggleFavorite() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => service.favorite(id, active),
    onMutate: async ({ id, active }) => {
      const key = keys.favorites(); await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<string[]>(key) ?? []
      client.setQueryData<string[]>(key, active ? [...new Set([...previous, id])] : previous.filter((item) => item !== id))
      return { previous }
    },
    onError: (_error, _variables, context) => { if (context) client.setQueryData(keys.favorites(), context.previous) },
    onSettled: () => client.invalidateQueries({ queryKey: keys.favorites() }),
  })
}

