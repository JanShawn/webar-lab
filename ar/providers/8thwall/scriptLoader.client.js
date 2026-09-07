const DEFAULT_TIMEOUT_MS = 20000

const waitForGlobal = ({globalName, eventName, timeoutMs}) => new Promise((resolve, reject) => {
  if (window[globalName]) {
    resolve(window[globalName])
    return
  }

  let pollId = null
  let timeoutId = null

  const cleanup = () => {
    if (pollId) window.clearInterval(pollId)
    if (timeoutId) window.clearTimeout(timeoutId)
    if (eventName) window.removeEventListener(eventName, handleReady)
  }

  const handleReady = () => {
    if (!window[globalName]) return
    cleanup()
    resolve(window[globalName])
  }

  if (eventName) window.addEventListener(eventName, handleReady)
  pollId = window.setInterval(handleReady, 50)
  timeoutId = window.setTimeout(() => {
    cleanup()
    reject(Object.assign(new Error(`載入 ${globalName} 逾時`), {code: 'ENGINE_LOAD_FAILED'}))
  }, timeoutMs)
})

export const load8thWallScript = async ({
  id,
  src,
  globalName,
  eventName,
  attributes = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) => {
  if (window[globalName]) return window[globalName]
  if (!src) throw Object.assign(new Error(`${globalName} 缺少 script URL`), {code: 'ENGINE_LOAD_FAILED'})

  const ready = waitForGlobal({globalName, eventName, timeoutMs})
  let script = document.getElementById(id)

  if (!script) {
    script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = globalName === 'XR8'
    script.crossOrigin = 'anonymous'
    Object.entries(attributes).forEach(([name, value]) => script.setAttribute(name, value))
    document.head.appendChild(script)
  }

  return ready
}

