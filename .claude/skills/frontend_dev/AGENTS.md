# React Best Practices - Complete Document

**Version 1.0.0**
Vercel Engineering
January 2026

> **Note:**
> This document is mainly for agents and LLMs to follow when maintaining,
> generating, or refactoring React and Next.js codebases. Humans
> may also find it useful, but guidance here is optimized for automation
> and consistency by AI-assisted workflows.

---

## Abstract

Comprehensive performance optimization guide for React and Next.js applications, designed for AI agents and LLMs. Contains 40+ rules across 8 categories, prioritized by impact from critical (eliminating waterfalls, reducing bundle size) to incremental (advanced patterns). Each rule includes detailed explanations, real-world examples comparing incorrect vs. correct implementations, and specific impact metrics to guide automated refactoring and code generation.

---

## Table of Contents

1. [Eliminating Waterfalls](#1-eliminating-waterfalls) — **CRITICAL**
2. [Bundle Size Optimization](#2-bundle-size-optimization) — **CRITICAL**
3. [Server-Side Performance](#3-server-side-performance) — **HIGH**
4. [Client-Side Data Fetching](#4-client-side-data-fetching) — **MEDIUM-HIGH**
5. [Re-render Optimization](#5-re-render-optimization) — **MEDIUM**
6. [Rendering Performance](#6-rendering-performance) — **MEDIUM**
7. [JavaScript Performance](#7-javascript-performance) — **LOW-MEDIUM**
8. [Advanced Patterns](#8-advanced-patterns) — **LOW**

---

## 1. Eliminating Waterfalls

**Impact: CRITICAL**

Waterfalls are the #1 performance killer. Each sequential await adds full network latency. Eliminating them yields the largest gains.

### 1.1 Defer Await Until Needed

**Impact: HIGH (avoids blocking unused code paths)**

Move `await` operations into the branches where they're actually used to avoid blocking code paths that don't need them.

**Incorrect: blocks both branches**

```typescript
async function handleRequest(userId: string, skipProcessing: boolean) {
  const userData = await fetchUserData(userId)

  if (skipProcessing) {
    return { skipped: true }
  }

  return processUserData(userData)
}
```

**Correct: only blocks when needed**

```typescript
async function handleRequest(userId: string, skipProcessing: boolean) {
  if (skipProcessing) {
    return { skipped: true }
  }

  const userData = await fetchUserData(userId)
  return processUserData(userData)
}
```

### 1.2 Dependency-Based Parallelization

**Impact: CRITICAL (2-10x improvement)**

For operations with partial dependencies, maximize parallelism by starting independent work immediately.

**Incorrect: profile waits for config unnecessarily**

```typescript
const [user, config] = await Promise.all([
  fetchUser(),
  fetchConfig()
])
const profile = await fetchProfile(user.id)
```

**Correct: config and profile run in parallel**

```typescript
const userPromise = fetchUser()
const profilePromise = userPromise.then(user => fetchProfile(user.id))

const [user, config, profile] = await Promise.all([
  userPromise,
  fetchConfig(),
  profilePromise
])
```

### 1.3 Prevent Waterfall Chains in API Routes

**Impact: CRITICAL (2-10x improvement)**

In API routes and Server Actions, start independent operations immediately, even if you don't await them yet.

**Incorrect: config waits for auth, data waits for both**

```typescript
export async function GET(request: Request) {
  const session = await auth()
  const config = await fetchConfig()
  const data = await fetchData(session.user.id)
  return Response.json({ data, config })
}
```

**Correct: auth and config start immediately**

```typescript
export async function GET(request: Request) {
  const sessionPromise = auth()
  const configPromise = fetchConfig()
  const session = await sessionPromise
  const [config, data] = await Promise.all([
    configPromise,
    fetchData(session.user.id)
  ])
  return Response.json({ data, config })
}
```

### 1.4 Promise.all() for Independent Operations

**Impact: CRITICAL (2-10x improvement)**

When async operations have no interdependencies, execute them concurrently using `Promise.all()`.

**Incorrect: sequential execution, 3 round trips**

```typescript
const user = await fetchUser()
const posts = await fetchPosts()
const comments = await fetchComments()
```

**Correct: parallel execution, 1 round trip**

```typescript
const [user, posts, comments] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchComments()
])
```

### 1.5 Strategic Suspense Boundaries

**Impact: HIGH (faster initial paint)**

Use Suspense boundaries to show wrapper UI faster while data loads.

**Incorrect: wrapper blocked by data fetching**

```tsx
async function Page() {
  const data = await fetchData()
  return (
    <div>
      <div>Sidebar</div>
      <div>Header</div>
      <div><DataDisplay data={data} /></div>
      <div>Footer</div>
    </div>
  )
}
```

**Correct: wrapper shows immediately, data streams in**

```tsx
function Page() {
  return (
    <div>
      <div>Sidebar</div>
      <div>Header</div>
      <div>
        <Suspense fallback={<Skeleton />}>
          <DataDisplay />
        </Suspense>
      </div>
      <div>Footer</div>
    </div>
  )
}

async function DataDisplay() {
  const data = await fetchData()
  return <div>{data.content}</div>
}
```

---

## 2. Bundle Size Optimization

**Impact: CRITICAL**

Reducing initial bundle size improves Time to Interactive and Largest Contentful Paint.

### 2.1 Avoid Barrel File Imports

**Impact: CRITICAL (200-800ms import cost, slow builds)**

Import directly from source files instead of barrel files to avoid loading thousands of unused modules.

**Incorrect: imports entire library**

```tsx
import { Check, X, Menu } from 'lucide-react'
import { Button, TextField } from '@mui/material'
```

**Correct: imports only what you need**

```tsx
import Check from 'lucide-react/dist/esm/icons/check'
import X from 'lucide-react/dist/esm/icons/x'
import Menu from 'lucide-react/dist/esm/icons/menu'

import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
```

**Alternative: Next.js 13.5+**

```js
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@mui/material']
  }
}
```

### 2.2 Conditional Module Loading

**Impact: HIGH (loads large data only when needed)**

Load large data or modules only when a feature is activated.

```tsx
function AnimationPlayer({ enabled, setEnabled }) {
  const [frames, setFrames] = useState(null)

  useEffect(() => {
    if (enabled && !frames && typeof window !== 'undefined') {
      import('./animation-frames.js')
        .then(mod => setFrames(mod.frames))
        .catch(() => setEnabled(false))
    }
  }, [enabled, frames, setEnabled])

  if (!frames) return <Skeleton />
  return <Canvas frames={frames} />
}
```

### 2.3 Defer Non-Critical Third-Party Libraries

**Impact: MEDIUM (loads after hydration)**

Analytics, logging, and error tracking don't block user interaction. Load them after hydration.

```tsx
import dynamic from 'next/dynamic'

const Analytics = dynamic(
  () => import('@vercel/analytics/react').then(m => m.Analytics),
  { ssr: false }
)
```

### 2.4 Dynamic Imports for Heavy Components

**Impact: CRITICAL (directly affects TTI and LCP)**

Use `next/dynamic` to lazy-load large components not needed on initial render.

```tsx
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(
  () => import('./monaco-editor').then(m => m.MonacoEditor),
  { ssr: false }
)
```

### 2.5 Preload Based on User Intent

**Impact: MEDIUM (reduces perceived latency)**

Preload heavy bundles before they're needed.

```tsx
function EditorButton({ onClick }) {
  const preload = () => {
    if (typeof window !== 'undefined') {
      void import('./monaco-editor')
    }
  }

  return (
    <button onMouseEnter={preload} onFocus={preload} onClick={onClick}>
      Open Editor
    </button>
  )
}
```

---

## 3. Server-Side Performance

**Impact: HIGH**

### 3.1 Authenticate Server Actions Like API Routes

**Impact: CRITICAL (prevents unauthorized access)**

Server Actions are exposed as public endpoints. Always verify authentication inside each Server Action.

```typescript
'use server'

import { verifySession } from '@/lib/auth'

export async function deleteUser(userId: string) {
  const session = await verifySession()
  if (!session) throw new Error('Unauthorized')
  if (session.user.role !== 'admin' && session.user.id !== userId) {
    throw new Error('Forbidden')
  }
  await db.user.delete({ where: { id: userId } })
  return { success: true }
}
```

### 3.2 Avoid Duplicate Serialization in RSC Props

**Impact: LOW**

RSC serialization deduplicates by object reference. Do transformations (`.toSorted()`, `.filter()`, `.map()`) in client, not server.

**Incorrect: duplicates array**

```tsx
<ClientList usernames={usernames} usernamesOrdered={usernames.toSorted()} />
```

**Correct: sends once**

```tsx
<ClientList usernames={usernames} />
// Client: const sorted = useMemo(() => [...usernames].sort(), [usernames])
```

### 3.3 Cross-Request LRU Caching

**Impact: HIGH (caches across requests)**

`React.cache()` only works within one request. Use LRU cache for data shared across requests.

```typescript
import { LRUCache } from 'lru-cache'

const cache = new LRUCache<string, any>({ max: 1000, ttl: 5 * 60 * 1000 })

export async function getUser(id: string) {
  const cached = cache.get(id)
  if (cached) return cached
  const user = await db.user.findUnique({ where: { id } })
  cache.set(id, user)
  return user
}
```

### 3.4 Minimize Serialization at RSC Boundaries

**Impact: HIGH (reduces data transfer size)**

Only pass fields that the client actually uses.

**Incorrect: serializes all 50 fields**

```tsx
async function Page() {
  const user = await fetchUser()
  return <Profile user={user} />
}
```

**Correct: serializes only 1 field**

```tsx
async function Page() {
  const user = await fetchUser()
  return <Profile name={user.name} />
}
```

### 3.5 Parallel Data Fetching with Component Composition

**Impact: CRITICAL (eliminates server-side waterfalls)**

Restructure with composition to parallelize data fetching.

```tsx
async function Header() {
  const data = await fetchHeader()
  return <div>{data}</div>
}

async function Sidebar() {
  const items = await fetchSidebarItems()
  return <nav>{items.map(renderItem)}</nav>
}

export default function Page() {
  return (
    <div>
      <Header />
      <Sidebar />
    </div>
  )
}
```

### 3.6 Per-Request Deduplication with React.cache()

**Impact: MEDIUM**

```typescript
import { cache } from 'react'

export const getCurrentUser = cache(async () => {
  const session = await auth()
  if (!session?.user?.id) return null
  return await db.user.findUnique({ where: { id: session.user.id } })
})
```

### 3.7 Use after() for Non-Blocking Operations

**Impact: MEDIUM (faster response times)**

```tsx
import { after } from 'next/server'

export async function POST(request: Request) {
  await updateDatabase(request)

  after(async () => {
    const userAgent = (await headers()).get('user-agent') || 'unknown'
    logUserAction({ userAgent })
  })

  return Response.json({ status: 'success' })
}
```

---

## 4. Client-Side Data Fetching

**Impact: MEDIUM-HIGH**

### 4.1 Deduplicate Global Event Listeners

**Impact: LOW**

Use `useSWRSubscription()` to share global event listeners across component instances.

### 4.2 Use Passive Event Listeners for Scrolling Performance

**Impact: MEDIUM**

Add `{ passive: true }` to touch and wheel event listeners.

```typescript
document.addEventListener('touchstart', handleTouch, { passive: true })
document.addEventListener('wheel', handleWheel, { passive: true })
```

### 4.3 Use SWR for Automatic Deduplication

**Impact: MEDIUM-HIGH**

```tsx
import useSWR from 'swr'

function UserList() {
  const { data: users } = useSWR('/api/users', fetcher)
}
```

### 4.4 Version and Minimize localStorage Data

**Impact: MEDIUM**

Add version prefix to keys and store only needed fields. Always wrap in try-catch.

```typescript
const VERSION = 'v2'

function saveConfig(config: { theme: string; language: string }) {
  try {
    localStorage.setItem(`userConfig:${VERSION}`, JSON.stringify(config))
  } catch {}
}
```

---

## 5. Re-render Optimization

**Impact: MEDIUM**

### 5.1 Calculate Derived State During Rendering

Derive values from props/state instead of storing in state + syncing with effects.

```tsx
function Form() {
  const [firstName, setFirstName] = useState('First')
  const [lastName, setLastName] = useState('Last')
  const fullName = firstName + ' ' + lastName
  return <p>{fullName}</p>
}
```

### 5.2 Defer State Reads to Usage Point

Don't subscribe to dynamic state if you only read it inside callbacks.

```tsx
function ShareButton({ chatId }) {
  const handleShare = () => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    shareChat(chatId, { ref })
  }
  return <button onClick={handleShare}>Share</button>
}
```

### 5.3 Don't Wrap Simple Expressions in useMemo

When an expression is simple and has a primitive result, don't wrap it in `useMemo`.

```tsx
// Correct:
const isLoading = user.isLoading || notifications.isLoading
```

### 5.4 Extract Default Non-primitive Parameter Values to Constants

```tsx
const NOOP = () => {};

const UserAvatar = memo(function UserAvatar({ onClick = NOOP }) {
  // ...
})
```

### 5.5 Extract to Memoized Components

Extract expensive work into memoized components to enable early returns.

### 5.6 Narrow Effect Dependencies

Specify primitive dependencies instead of objects.

```tsx
// Incorrect: re-runs on any user field change
useEffect(() => { console.log(user.id) }, [user])

// Correct: re-runs only when id changes
useEffect(() => { console.log(user.id) }, [user.id])
```

### 5.7 Put Interaction Logic in Event Handlers

If a side effect is triggered by a user action, run it in the event handler, not in a state + effect.

### 5.8 Subscribe to Derived State

Subscribe to derived boolean state instead of continuous values.

```tsx
const isMobile = useMediaQuery('(max-width: 767px)')
```

### 5.9 Use Functional setState Updates

```tsx
const addItems = useCallback((newItems) => {
  setItems(curr => [...curr, ...newItems])
}, [])
```

### 5.10 Use Lazy State Initialization

```tsx
const [settings, setSettings] = useState(() => {
  const stored = localStorage.getItem('settings')
  return stored ? JSON.parse(stored) : {}
})
```

### 5.11 Use Transitions for Non-Urgent Updates

```tsx
import { startTransition } from 'react'

const handler = () => {
  startTransition(() => setScrollY(window.scrollY))
}
```

### 5.12 Use useRef for Transient Values

Store frequently-changing values that don't need re-renders in refs.

---

## 6. Rendering Performance

**Impact: MEDIUM**

### 6.1 Animate SVG Wrapper Instead of SVG Element

Wrap SVG in a `<div>` and animate the wrapper for hardware acceleration.

### 6.2 CSS content-visibility for Long Lists

```css
.message-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px;
}
```

### 6.3 Hoist Static JSX Elements

Extract static JSX outside components to avoid re-creation.

```tsx
const loadingSkeleton = <div className="animate-pulse h-20 bg-gray-200" />
```

### 6.4 Optimize SVG Precision

Reduce SVG coordinate precision: `npx svgo --precision=1 --multipass icon.svg`

### 6.5 Prevent Hydration Mismatch Without Flickering

Use synchronous inline scripts to set client-only values before React hydrates.

### 6.6 Suppress Expected Hydration Mismatches

```tsx
<span suppressHydrationWarning>{new Date().toLocaleString()}</span>
```

### 6.7 Use Activity Component for Show/Hide

```tsx
import { Activity } from 'react'

function Dropdown({ isOpen }) {
  return (
    <Activity mode={isOpen ? 'visible' : 'hidden'}>
      <ExpensiveMenu />
    </Activity>
  )
}
```

### 6.8 Use Explicit Conditional Rendering

Use `? :` instead of `&&` to prevent rendering `0` or `NaN`.

```tsx
{count > 0 ? <span className="badge">{count}</span> : null}
```

### 6.9 Use useTransition Over Manual Loading States

```tsx
const [isPending, startTransition] = useTransition()

const handleSearch = (value) => {
  setQuery(value)
  startTransition(async () => {
    const data = await fetchResults(value)
    setResults(data)
  })
}
```

---

## 7. JavaScript Performance

**Impact: LOW-MEDIUM**

### 7.1 Avoid Layout Thrashing

Batch style writes, then read. Don't interleave reads and writes.

### 7.2 Build Index Maps for Repeated Lookups

```typescript
const userById = new Map(users.map(u => [u.id, u]))
return orders.map(order => ({ ...order, user: userById.get(order.userId) }))
```

### 7.3 Cache Property Access in Loops

```typescript
const value = obj.config.settings.value
const len = arr.length
for (let i = 0; i < len; i++) { process(value) }
```

### 7.4 Cache Repeated Function Calls

Use module-level Maps to cache results of pure functions called repeatedly.

### 7.5 Cache Storage API Calls

Cache `localStorage`/`sessionStorage`/`document.cookie` reads in memory.

### 7.6 Combine Multiple Array Iterations

Use a single loop instead of multiple `.filter()` calls.

### 7.7 Early Length Check for Array Comparisons

Check lengths first before expensive comparison operations.

### 7.8 Early Return from Functions

Return early when result is determined to skip unnecessary processing.

### 7.9 Hoist RegExp Creation

Don't create RegExp inside render. Hoist to module scope or memoize.

### 7.10 Use Loop for Min/Max Instead of Sort

Finding min/max only requires O(n) single pass, not O(n log n) sort.

### 7.11 Use Set/Map for O(1) Lookups

```typescript
const allowedIds = new Set(['a', 'b', 'c'])
items.filter(item => allowedIds.has(item.id))
```

### 7.12 Use toSorted() Instead of sort() for Immutability

`.sort()` mutates in place. Use `.toSorted()` to avoid mutating React state/props.

---

## 8. Advanced Patterns

**Impact: LOW**

### 8.1 Initialize App Once, Not Per Mount

Use a module-level guard for one-time initialization instead of `useEffect([])`.

```tsx
let didInit = false

function Comp() {
  useEffect(() => {
    if (didInit) return
    didInit = true
    loadFromStorage()
    checkAuthToken()
  }, [])
}
```

### 8.2 Store Event Handlers in Refs

Store callbacks in refs when used in effects that shouldn't re-subscribe on callback changes.

### 8.3 useEffectEvent for Stable Callback Refs

Access latest values in callbacks without adding them to dependency arrays.

```tsx
import { useEffectEvent } from 'react'

function SearchInput({ onSearch }) {
  const [query, setQuery] = useState('')
  const onSearchEvent = useEffectEvent(onSearch)

  useEffect(() => {
    const timeout = setTimeout(() => onSearchEvent(query), 300)
    return () => clearTimeout(timeout)
  }, [query])
}
```

---

## References

1. [https://react.dev](https://react.dev)
2. [https://nextjs.org](https://nextjs.org)
3. [https://swr.vercel.app](https://swr.vercel.app)
4. [https://github.com/shuding/better-all](https://github.com/shuding/better-all)
5. [https://github.com/isaacs/node-lru-cache](https://github.com/isaacs/node-lru-cache)
6. [https://vercel.com/blog/how-we-optimized-package-imports-in-next-js](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js)
7. [https://vercel.com/blog/how-we-made-the-vercel-dashboard-twice-as-fast](https://vercel.com/blog/how-we-made-the-vercel-dashboard-twice-as-fast)
