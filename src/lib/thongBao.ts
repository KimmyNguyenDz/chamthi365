// Toast toàn cục — hiện được cả sau khi chuyển màn
type Fn = (s: string) => void
const cbs = new Set<Fn>()

export function thongBao(s: string) { cbs.forEach(f => f(s)) }

export function ngheThongBao(f: Fn): () => void {
  cbs.add(f)
  return () => cbs.delete(f)
}
