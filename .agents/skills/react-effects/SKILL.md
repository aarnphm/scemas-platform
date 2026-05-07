---
name: react-effects
description: Use when writing or reviewing React components that use useEffect, useState, useMemo, or useSyncExternalStore. Provides anti-patterns for unnecessary effects and their fixes. Do not use for non-React code or backend work.
---

## the rule

effects synchronize with EXTERNAL systems (DOM APIs, non-react widgets, network for display-driven fetches). if no external system is involved, you probably don't need an effect.

two cases where effects are wrong:

1. **transforming data for rendering** — calculate during render instead. avoids an extra render pass with stale values
2. **handling user events** — use event handlers. you know exactly what happened (which button, which form). effects don't

## anti-patterns and fixes

### derived state → calculate during render

```tsx
// 🔴
const [fullName, setFullName] = useState('')
useEffect(() => {
  setFullName(first + ' ' + last)
}, [first, last])

// ✅
const fullName = first + ' ' + last
```

if the calculation is expensive, wrap in `useMemo`. react compiler can often handle this automatically.

```tsx
const visibleTodos = useMemo(() => getFilteredTodos(todos, filter), [todos, filter])
```

### state reset on prop change → key prop

```tsx
// 🔴
useEffect(() => {
  setComment('')
}, [userId])

// ✅ — different key = different component instance, state resets automatically
;<Profile userId={userId} key={userId} />
```

### state adjustment on prop change → derive from ID

```tsx
// 🔴
useEffect(() => {
  setSelection(null)
}, [items])

// ✅ — store the ID, derive the object
const [selectedId, setSelectedId] = useState(null)
const selection = items.find(item => item.id === selectedId) ?? null
```

### shared event handler logic → extract a function

```tsx
// 🔴 — notification fires on mount/reload, not just on user action
useEffect(() => {
  if (product.isInCart) showNotification(`Added ${product.name}`)
}, [product])

// ✅
function buyProduct() {
  addToCart(product)
  showNotification(`Added ${product.name}`)
}
```

### POST on user action → event handler

```tsx
// 🔴
useEffect(() => {
  if (json !== null) post('/api/register', json)
}, [json])

// ✅
function handleSubmit(e) {
  e.preventDefault()
  post('/api/register', { firstName, lastName })
}
```

analytics on mount is fine as an effect (component was displayed). form submission is not (user pressed a button).

### effect chains → calculate during render + single event handler

```tsx
// 🔴 — setCard → setGoldCardCount → setRound → setIsGameOver, each triggering a re-render
useEffect(() => {
  /* chain */
}, [card])
useEffect(() => {
  /* chain */
}, [goldCardCount])

// ✅
const isGameOver = round > 5 // derived

function handlePlaceCard(nextCard) {
  setCard(nextCard)
  if (nextCard.gold) {
    if (goldCardCount < 3) setGoldCardCount(goldCardCount + 1)
    else {
      setGoldCardCount(0)
      setRound(round + 1)
    }
  }
}
```

### notifying parent about state changes → call during event

```tsx
// 🔴 — extra render pass: child updates, then effect fires, then parent updates
useEffect(() => {
  onChange(isOn)
}, [isOn, onChange])

// ✅ — both updates batched in one render
function updateToggle(nextIsOn) {
  setIsOn(nextIsOn)
  onChange(nextIsOn)
}
```

even better: lift state up so parent owns `isOn` entirely.

### passing data to parent → fetch in parent, pass down

```tsx
// 🔴
function Child({ onFetched }) {
  const data = useSomeAPI()
  useEffect(() => {
    if (data) onFetched(data)
  }, [data])
}

// ✅ — parent fetches, child receives
function Parent() {
  const data = useSomeAPI()
  return <Child data={data} />
}
```

### external store → useSyncExternalStore

```tsx
// 🔴 — manual subscription in effect
useEffect(() => {
  const handler = () => setIsOnline(navigator.onLine)
  window.addEventListener('online', handler)
  return () => window.removeEventListener('online', handler)
}, [])

// ✅
return useSyncExternalStore(
  subscribe,
  () => navigator.onLine,
  () => true,
)
```

### data fetching → cleanup for race conditions

```tsx
useEffect(() => {
  let ignore = false
  fetchResults(query, page).then(json => {
    if (!ignore) setResults(json)
  })
  return () => {
    ignore = true
  }
}, [query, page])
```

prefer framework-level data fetching (next.js server components, route loaders) over raw effects. if you must use effects for fetching, extract into a custom hook (`useData`).

### app initialization → module level or guarded effect

```tsx
// module level (runs once per import, not per mount)
if (typeof window !== 'undefined') {
  checkAuthToken()
  loadDataFromLocalStorage()
}
```

## decision heuristic

ask: "why does this code need to run?"

- **because the user did something** → event handler
- **because the component appeared on screen** → effect
- **because props/state changed and i need a new value** → calculate during render (or useMemo)
- **because i need to sync with something outside react** → effect (with cleanup)
