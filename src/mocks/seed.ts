import type { NFT } from '../domain'

type Portrait = { background: string; glow: string; fur: string; face: string; jacket: string; shirt: string; accessory: 'none' | 'glasses' | 'cap' | 'headphones' | 'visor' }

const portraits: Portrait[] = [
  { background: '#d8d0ad', glow: '#f2ead0', fur: '#865235', face: '#e8b986', jacket: '#194c3b', shirt: '#d7c7a0', accessory: 'none' },
  { background: '#b9a1c3', glow: '#eee2d0', fur: '#665049', face: '#d5a889', jacket: '#5f4256', shirt: '#d6c6b4', accessory: 'cap' },
  { background: '#8e9ca0', glow: '#d8d9c8', fur: '#3c3934', face: '#bd9272', jacket: '#253138', shirt: '#c3b49f', accessory: 'glasses' },
  { background: '#d9ac62', glow: '#f4d18a', fur: '#9d5735', face: '#edbd80', jacket: '#284a3c', shirt: '#e1d0ad', accessory: 'headphones' },
  { background: '#b9c3a1', glow: '#e1dec0', fur: '#74503a', face: '#d8aa7c', jacket: '#566248', shirt: '#d6c49c', accessory: 'visor' },
  { background: '#cf8870', glow: '#e8c49d', fur: '#493932', face: '#bd8969', jacket: '#493b31', shirt: '#d0b9a0', accessory: 'glasses' },
  { background: '#7d9ca1', glow: '#c4d0bb', fur: '#8a6547', face: '#e0b889', jacket: '#283b50', shirt: '#c6c9b2', accessory: 'cap' },
  { background: '#c5a57f', glow: '#eed9a8', fur: '#70472f', face: '#d6a478', jacket: '#594332', shirt: '#dfc89c', accessory: 'none' },
  { background: '#a79ac2', glow: '#e6d5c9', fur: '#51433f', face: '#cf9c7b', jacket: '#3d3856', shirt: '#d8c8b1', accessory: 'headphones' },
  { background: '#92aa86', glow: '#d8d4a9', fur: '#6e4d35', face: '#d9a77b', jacket: '#345248', shirt: '#d4c79f', accessory: 'visor' },
  { background: '#cb8365', glow: '#efc786', fur: '#8a4b31', face: '#e2aa74', jacket: '#5b3c32', shirt: '#e2ca9b', accessory: 'glasses' },
  { background: '#7799a7', glow: '#c3d2bd', fur: '#51443a', face: '#c99673', jacket: '#263e50', shirt: '#d7c9ac', accessory: 'none' },
]

function artwork(index: number) {
  const p = portraits[index % portraits.length]
  const accessory = p.accessory === 'glasses'
    ? '<g fill="#211c19" fill-opacity=".88" stroke="#d6bb8c" stroke-width="4"><rect x="91" y="132" width="54" height="30" rx="12"/><rect x="175" y="132" width="54" height="30" rx="12"/><path d="M145 144q15-10 30 0" fill="none"/></g><path d="M103 139h19M188 139h19" stroke="#fff" stroke-opacity=".56" stroke-width="4" stroke-linecap="round"/>'
    : p.accessory === 'cap'
      ? '<path d="M74 111q8-67 86-70 56 0 78 61-58 24-164 9Z" fill="#594b47" stroke="#302720" stroke-width="7"/><path d="M88 102q61 12 141-4" fill="none" stroke="#b89a70" stroke-width="5"/><path d="M214 99q28 1 39 15-23 10-49 2" fill="#3e3531"/>'
      : p.accessory === 'headphones'
        ? '<path d="M67 155v-27q0-91 93-91t93 91v27" fill="none" stroke="#d7ad62" stroke-width="15"/><rect x="54" y="137" width="29" height="60" rx="13" fill="#4b4841" stroke="#d7ad62" stroke-width="5"/><rect x="237" y="137" width="29" height="60" rx="13" fill="#4b4841" stroke="#d7ad62" stroke-width="5"/>'
        : p.accessory === 'visor'
          ? '<path d="M79 103q81-40 162 0l-5 28H84Z" fill="#c5a45d" stroke="#51483b" stroke-width="6"/><path d="M91 112q69-27 138 0" fill="none" stroke="#f1d699" stroke-width="5"/>'
          : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 360"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.glow}"/><stop offset="1" stop-color="${p.background}"/></linearGradient><radialGradient id="halo"><stop stop-color="#fff" stop-opacity=".48"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><linearGradient id="fur" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.face}"/><stop offset=".42" stop-color="${p.fur}"/><stop offset="1" stop-color="#352820"/></linearGradient><linearGradient id="skin" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f0c99b"/><stop offset="1" stop-color="${p.face}"/></linearGradient><linearGradient id="coat" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.jacket}"/><stop offset="1" stop-color="#171e1b"/></linearGradient><filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#24180f" flood-opacity=".35"/></filter><pattern id="grain" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="3" cy="6" r=".8" fill="#fff" opacity=".15"/><circle cx="13" cy="13" r=".6" fill="#30241d" opacity=".18"/></pattern></defs><rect width="320" height="360" fill="url(#bg)"/><circle cx="160" cy="122" r="130" fill="url(#halo)"/><path d="M17 64h30M32 49v30M270 236h26M283 223v26" stroke="#fff" stroke-opacity=".22" stroke-width="2"/><circle cx="47" cy="180" r="3" fill="#fff" opacity=".4"/><circle cx="277" cy="94" r="2.5" fill="#fff" opacity=".6"/><path d="M0 285q63-38 132-5t188-10v90H0Z" fill="#33251d" opacity=".13"/><g filter="url(#shadow)"><path d="M39 360q9-82 65-103l56-17 57 17q55 21 64 103Z" fill="url(#coat)"/><path d="m112 257 48 54 49-54-31-15h-37Z" fill="${p.shirt}"/><path d="m112 257 28 17-26 42-31-56ZM208 257l-28 17 26 42 31-56Z" fill="#f1dfbc" fill-opacity=".68"/><path d="M145 265h30l-8 48-7 8-8-8Z" fill="#7b4931"/><path d="M120 241q-4-31 6-48h68q10 19 6 48l-40 27Z" fill="url(#skin)"/><ellipse cx="76" cy="151" rx="39" ry="51" fill="url(#fur)"/><ellipse cx="244" cy="151" rx="39" ry="51" fill="url(#fur)"/><ellipse cx="76" cy="151" rx="21" ry="29" fill="#c3825b" opacity=".82"/><ellipse cx="244" cy="151" rx="21" ry="29" fill="#c3825b" opacity=".82"/><path d="M87 132q1-76 73-86 77 5 73 91l-13 70q-14 48-60 52-44-1-60-47Z" fill="url(#fur)" stroke="#493327" stroke-width="4"/><path d="M111 141q5-36 49-36t49 36l-7 57q-11 33-42 34-32-1-42-35Z" fill="url(#skin)"/><path d="M105 135q18-18 40-8M175 127q23-10 40 8" fill="none" stroke="#473228" stroke-width="11" stroke-linecap="round"/><ellipse cx="130" cy="147" rx="7" ry="10" fill="#171513"/><ellipse cx="190" cy="147" rx="7" ry="10" fill="#171513"/><circle cx="132" cy="144" r="2.4" fill="#fff"/><circle cx="192" cy="144" r="2.4" fill="#fff"/><ellipse cx="160" cy="179" rx="42" ry="28" fill="url(#skin)"/><ellipse cx="160" cy="170" rx="13" ry="9" fill="#34231d"/><path d="M145 190q15 12 30 0" fill="none" stroke="#55342b" stroke-width="4" stroke-linecap="round"/><path d="M101 115q9-43 54-53M168 61q39 4 51 45" fill="none" stroke="#f5d0a1" stroke-opacity=".28" stroke-width="6" stroke-linecap="round"/>${accessory}</g><rect width="320" height="360" fill="url(#grain)"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const titles = [
  ['Emerald Ape #42', 'Kurio Genesis', 'PFP'], ['Violet Voyager #08', 'Orbit Society', 'Collectible'], ['Midnight Pilot #17', 'Night Shift', 'PFP'],
  ['Golden Hour Ape #11', 'Kurio Genesis', 'Art'], ['Moss Captain #05', 'Garden Club', 'Collectible'], ['Orange Orbit #03', 'Orbit Society', 'PFP'],
  ['Blue Note #21', 'After Hours', 'Photography'], ['Sun Collector #09', 'Golden Hour', 'Art'], ['Dreamwalker #14', 'Soft Futures', 'Collectible'],
  ['Garden Guardian #31', 'Garden Club', 'PFP'], ['Sunset Club #22', 'Kurio Genesis', 'Collectible'], ['Cloud Nine #06', 'Golden Hour', 'Art'],
  ['Museum Visitor #12', 'After Hours', 'Photography'], ['A Warm Place #04', 'Garden Club', 'PFP'], ['Nocturne #15', 'Night Shift', 'Art'],
  ['Sleepy Satellite #02', 'Orbit Society', 'Collectible'], ['Honey Season #19', 'Golden Hour', 'Photography'], ['Last Train Home #07', 'Soft Futures', 'PFP'],
  ['Little Red Planet #18', 'Soft Futures', 'Art'], ['Pocket Forest #26', 'Garden Club', 'Collectible'], ['Night Swimmer #13', 'After Hours', 'Photography'],
  ['The Lucky One #01', 'Orbit Society', 'PFP'], ['Paper Moon #16', 'Night Shift', 'Art'], ['Warm Static #03', 'Golden Hour', 'Collectible'],
] as const

export const seedNFTs: NFT[] = titles.map(([title, collection, category], index) => ({
  id: `ember-${String(index + 1).padStart(3, '0')}`,
  title,
  collection,
  creator: ['mira.studio', 'joon.draws', 'littlethings.eth', 'coco.art'][index % 4],
  category,
  priceEth: index === 0 ? '1.19' : (0.18 + (index * 0.173 % 2.3)).toFixed(2),
  available: 8 + (index * 7 % 39),
  editionSize: 50 + (index * 17 % 100),
  views: 8500 - index * 237,
  art: index === 0 ? '/featured-ape.svg' : artwork(index),
  featured: index === 0 || index === 6 || index === 10,
  version: 1,
  createdAt: new Date(Date.UTC(2025, 5 + index % 10, 3 + index % 25)).toISOString(),
}))
