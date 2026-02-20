export function setStatus(key, state, value) {
  const dot = document.getElementById(`dot-${key}`)
  const val = document.getElementById(`val-${key}`)
  dot.className = `dot ${state}`
  if (val) val.textContent = value
}

export function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
