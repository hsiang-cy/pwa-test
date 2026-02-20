import { setStatus } from './utils.js'

let watchId = null

document.getElementById('geo-btn').addEventListener('click', () => requestGeo(false))

document.getElementById('watch-btn').addEventListener('click', () => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
    document.getElementById('watch-btn').textContent = '👁 持續追蹤位置'
    setStatus('geo', 'ok', '追蹤已停止')
    return
  }
  requestGeo(true)
})

function requestGeo(watch) {
  if (!('geolocation' in navigator)) {
    setStatus('geo', 'err', '不支援')
    return
  }
  setStatus('geo', 'pulse', '請求中…')
  const opts = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  if (watch) {
    document.getElementById('watch-btn').textContent = '⏹ 停止追蹤'
    watchId = navigator.geolocation.watchPosition(showPos, geoErr, opts)
  } else {
    navigator.geolocation.getCurrentPosition(showPos, geoErr, opts)
  }
}

function showPos(pos) {
  const { latitude: lat, longitude: lng, accuracy } = pos.coords
  setStatus('geo', 'ok', `精度 ±${Math.round(accuracy)}m`)
  const disp = document.getElementById('coords-display')
  disp.style.display = 'block'
  disp.innerHTML = `緯度　<strong>${lat.toFixed(6)}</strong><br>經度　<strong>${lng.toFixed(6)}</strong><br>精度　±${Math.round(accuracy)} 公尺`
  document.getElementById('map-box').style.display = 'block'
  document.getElementById('map-frame').src =
    `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`
}

function geoErr(err) {
  const msgs = { 1: '拒絕授權', 2: '位置無法取得', 3: '逾時' }
  setStatus('geo', 'err', msgs[err.code] || '未知錯誤')
}
