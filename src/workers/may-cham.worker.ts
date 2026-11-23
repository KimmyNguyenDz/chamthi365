/// <reference lib="webworker" />
import { xuLyTin } from './may-cham.core'

const qt = self as unknown as Worker
qt.onmessage = (e: MessageEvent) => {
  xuLyTin(e.data).then(r => qt.postMessage(r))
}
