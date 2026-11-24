/** Tải bytes xuống máy thành tệp */
export function taiTep(bytes: Uint8Array | Blob, ten: string) {
  const b = bytes instanceof Blob ? bytes : new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(b)
  const a = document.createElement('a')
  a.href = url; a.download = ten; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
