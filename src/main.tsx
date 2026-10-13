import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './styles/global.css'
import './styles/components/common.css'
import './styles/components/demo.css'
import './styles/responsive.css'
import { setMockReadiness } from './lib/mock-readiness'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 12_000, gcTime: 5 * 60_000 }, mutations: { retry: false } } })

async function startMocking() {
    if (import.meta.env.DEV || import.meta.env.MODE === 'demo' || import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ serviceWorker: { url: '/mockServiceWorker.js' }, onUnhandledRequest: 'bypass' })
  }
}

const mockReadiness = startMocking()
setMockReadiness(mockReadiness)
void mockReadiness.then(() => { document.documentElement.dataset.mockReady = 'true' }).catch((error: unknown) => {
  document.documentElement.dataset.mockReady = 'failed'
  console.error('Could not start the demo network.', error)
})
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><QueryClientProvider client={queryClient}><App /></QueryClientProvider></React.StrictMode>)

