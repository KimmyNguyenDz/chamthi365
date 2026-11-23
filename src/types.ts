// Kiểu dữ liệu xuyên suốt Chamthi365 — khớp schema app gốc (xem spec §5)

export type KhuonTep = { trang: number; clip: [number, number, number, number] | null; khuon: string }

export type MauPhieu = {
  ma: string; ten: string; ho: string; khuon: KhuonTep[]
  ky?: string; phach: boolean; so_sbd: number; so_ma: number; stt: boolean
  o_diem: boolean; mau: boolean; tu_luan: boolean; so_trang: number
  p1: number; p2: number; p3: number; da_va: number; ban_sao?: string[]; tu: string
  qr?: boolean // phiếu QR của Chamthi365
}

export type Khuon = {
  trang: [number, number]
  r: number
  goc: [number, number][]
  moc: [number, number, number][]
  sbd: [number, number][][]
  ma: [number, number][][]
  khac: { ten: string; so: [number, number][][] }[]
  p1: { q: number; o: [number, number][] }[]
  p2: { q: number; y: [number, number][][] }[]
  p3: { q: number; c: { so: [number, number][]; tru?: [number, number]; phay?: [number, number] }[] }[]
  nhan: { p1: number; p2: number; p3: number }
  rk: Record<string, number>
  qr?: { x: number; y: number; canh: number }
}

export type Diem = {
  mau: string
  soCau: { p1: number; p2: number; p3: number }
  p1: number
  p2: number[] // điểm theo số ý đúng, vd [0,.1,.25,.5,1]
  p3: number
  tuLuan: number
  truP1: number
  lamTron: number
  boSo0Sau: boolean
  nhanPhayDau: boolean
}

export type DapAn = { ma: string; p1: string[]; p2: string[]; p3: string[] }

export type HocSinh = { sbd: string; ten: string; lop?: string }

export type Bai = {
  id: string; ten: string; mon: string; lop: string[]
  phieu: string; khuon: string
  diem: Diem
  dapAn: DapAn[]
  hocSinh: HocSinh[]
  boSbd?: boolean
  tao: number; sua: number
}

export type DocCham = {
  sbd: string
  ma: string
  maNguon?: 'qr' | 'to' | 'tay'
  sbdNguon?: 'qr' | 'to' | 'tay'
  p1: string[]
  p2: string[][]
  p3: string[]
  khac?: { ten: string; s: string }[]
}

export type CanXem = {
  loai: 'mo' | 'vet-tay' | 'nhieu-o' | 'trung-sbd' | 'thua-cau' | 'ma' | 'sbd' | 'sbd-la'
  phan?: 'p1' | 'p2' | 'p3' | 'ma' | 'sbd'
  q?: number
  i?: number
  doc?: string
}

export type OCham = {
  phan: 'sbd' | 'ma' | 'khac' | 'p1' | 'p2' | 'p3'
  q?: number
  i?: number
  x: number; y: number; r?: number
  to: boolean
  trangThai: 'dung' | 'sai' | 'mo' | 'xam' | 'tay' | 'trung'
}

export type KqCham = {
  doc: DocCham
  can: CanXem[]
  khung?: [number, number][]
  o: OCham[]
  anh?: Blob
  xoay180?: boolean
  thuTach?: number
}

export type Phieu = {
  id: string; baiId: string; stt: number; nguon: string; luc: number
  ok: boolean; kq?: KqCham; loi?: string; sua: Record<string, unknown>
}

export type HangCho = {
  khoa: string; loai: 'bai' | 'phieu' | 'xoaBai' | 'xoaPhieu' | 'anh'
  id: string; baiId?: string; luc: number; drive?: string
}
