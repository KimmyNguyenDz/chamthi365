// Âm thanh + rung + đọc điểm cho màn chấm — port hành vi app gốc

let _ac: AudioContext | null = null
const ac = () => (_ac ??= new (window.AudioContext || (window as any).webkitAudioContext)())

/** Bíp ngắn khi chấm xong / lỗi (tanGiam: âm trầm hơn cho phiếu lỗi) */
export function bip(loi = false) {
  try {
    const c = ac()
    const o = c.createOscillator(), g = c.createGain()
    o.type = 'sine'
    o.frequency.value = loi ? 330 : 880
    g.gain.setValueAtTime(0.0001, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.25, c.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (loi ? 0.3 : 0.14))
    o.connect(g).connect(c.destination)
    o.start()
    o.stop(c.currentTime + (loi ? 0.32 : 0.16))
    if (!loi) setTimeout(() => bip(), 90)
  } catch { /* máy không có audio */ }
}

export const rung = (ms = 60) => { try { navigator.vibrate?.(ms) } catch { } }

/** Đọc to kết quả (vi-VN); không có TTS → bíp thay */
export function docTo(text: string) {
  try {
    const ss = window.speechSynthesis
    if (!ss) { bip(); return }
    ss.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'vi-VN'
    u.rate = 1.15
    ss.speak(u)
  } catch { bip() }
}
