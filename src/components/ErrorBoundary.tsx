import { Component, type PropsWithChildren, type ReactNode } from 'react'

/** Chặn crash React — dữ liệu trong IndexedDB vẫn còn, mở lại là chạy tiếp */
export class ErrorBoundary extends Component<PropsWithChildren, { loi: ReactNode }> {
  state = { loi: null as ReactNode }
  static getDerivedStateFromError(e: unknown) { return { loi: String((e as Error)?.message ?? e) } }
  render() {
    if (!this.state.loi) return this.props.children
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20, fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 44 }}>😵</div>
          <h2>Màn gặp sự cố</h2>
          <p style={{ color: '#555' }}>Bài chấm và phiếu vẫn còn nguyên trên máy — mở lại app là tiếp tục được.</p>
          <p style={{ fontSize: 12, color: '#999' }}>{this.state.loi}</p>
          <a href="#/" onClick={() => this.setState({ loi: null })} style={{ display: 'inline-block', marginTop: 8, fontWeight: 700 }}>Về trang chủ</a>
        </div>
      </div>
    )
  }
}
