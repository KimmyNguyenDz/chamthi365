import { useEffect, useState } from 'react'

// Router hash tối thiểu — các màn thật gắn dần ở các task sau
export function useHash(): string {
  const [h, setH] = useState(() => location.hash || '#/')
  useEffect(() => {
    const f = () => setH(location.hash || '#/')
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  return h
}

export function App() {
  const h = useHash()
  return (
    <div className="app">
      <h1>Chamthi365</h1>
      <p>Route: {h}</p>
    </div>
  )
}
