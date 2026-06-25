// Cross-platform light haptics.
//
// iOS/Safari does NOT support navigator.vibrate at all. The one trick that does
// fire the Taptic engine on iPhone is toggling a hidden <input type="checkbox"
// switch> via a connected <label>. We lazily create that element once and click
// its label to produce the system "switch" haptic. On Android we use the real
// Vibration API. Everywhere else this is a harmless no-op.

let switchEl = null
let labelEl = null

function ensureIOSElements() {
  if (switchEl || typeof document === 'undefined') return
  try {
    switchEl = document.createElement('input')
    switchEl.type = 'checkbox'
    switchEl.setAttribute('switch', '')          // Safari-only attribute
    switchEl.id = '__haptic_switch__'
    switchEl.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:0;height:0;'
    labelEl = document.createElement('label')
    labelEl.htmlFor = '__haptic_switch__'
    labelEl.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:0;height:0;'
    document.body.appendChild(switchEl)
    document.body.appendChild(labelEl)
  } catch { /* ignore */ }
}

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iP(hone|ad|od)/.test(navigator.platform || '') ||
   (/Mac/.test(navigator.platform || '') && navigator.maxTouchPoints > 1) ||
   /iPhone|iPad|iPod/.test(navigator.userAgent || ''))

export function haptic(pattern = 10) {
  try {
    if (isIOS()) {
      // Trigger the iOS switch haptic.
      ensureIOSElements()
      if (labelEl) labelEl.click()
      return
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  } catch { /* non-critical */ }
}

export const tapHaptic     = () => haptic(8)
export const successHaptic = () => haptic([12, 40, 12])
