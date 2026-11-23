// Google Drive — up ảnh phiếu vào thư mục Chamthi365 (scope drive.file)
const API = 'https://www.googleapis.com/drive/v3/files'
const UPL = 'https://www.googleapis.com/upload/drive/v3/files'

/** Tìm hoặc tạo thư mục Chamthi365, trả về {id, url} */
export async function layThuMuc(token: string): Promise<{ id: string; url: string }> {
  const env = import.meta.env.VITE_DRIVE_FOLDER as string | undefined
  if (env) return { id: env, url: `https://drive.google.com/drive/folders/${env}` }
  const q = encodeURIComponent("name='Chamthi365' and mimeType='application/vnd.google-apps.folder' and trashed=false")
  const r = await fetch(`${API}?q=${q}&fields=files(id)`, { headers: { Authorization: `Bearer ${token}` } })
  if (!r.ok) throw new Error('Drive ' + r.status)
  const j = await r.json()
  let id = j.files?.[0]?.id as string | undefined
  if (!id) {
    const c = await fetch(API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Chamthi365', mimeType: 'application/vnd.google-apps.folder' }),
    })
    if (!c.ok) throw new Error('Drive ' + c.status)
    id = (await c.json()).id
  }
  return { id: id!, url: `https://drive.google.com/drive/folders/${id}` }
}

/** Up 1 ảnh (multipart) → file id. Tên = khoa ảnh (id phiếu) */
export async function taiLen(token: string, thuMuc: string, ten: string, blob: Blob): Promise<string> {
  const meta = { name: ten, parents: [thuMuc] }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }))
  form.append('file', blob)
  const r = await fetch(`${UPL}?uploadType=multipart&fields=id`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
  })
  if (!r.ok) throw new Error('Up Drive ' + r.status)
  return (await r.json()).id
}
