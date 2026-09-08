/**
 * [共用 3D 互動｜可直接複用]
 * 將手機手勢轉成 Three.js 物件的旋轉與縮放：
 * - 單指拖曳：旋轉模型
 * - 雙指張合：縮放模型
 * - 沒有拖曳的短按：用 Raycaster 判斷是否點到模型
 *
 * 這裡不知道 8th Wall、Image Target 或 Vue，換成其他 AR provider 仍可使用。
 */
import * as THREE from 'three'

const TAP_MOVE_THRESHOLD_PX = 8
const PINCH_MOVE_THRESHOLD_PX = 3

const pointerDistance = ([first, second]) => {
  if (!first || !second) return 0
  return Math.hypot(second.x - first.x, second.y - first.y)
}

const normalizeYaw = (radians) => (
  THREE.MathUtils.euclideanModulo(radians + Math.PI, Math.PI * 2) - Math.PI
)

export const createModelGestureControls = ({
  canvas,
  camera,
  characterRoot,
  transformRoot,
  isManipulationEnabled = () => true,
  onTap,
  onTransform,
  minScale = 0.55,
  maxScale = 1.8,
  rotationSpeedDegrees = 0.35,
  minPitchDegrees = -35,
  maxPitchDegrees = 55,
  initialScale = 1,
  initialRotationDegrees = {x: 0, y: 0, z: 0},
}) => {
  const raycaster = new THREE.Raycaster()
  const normalizedPointer = new THREE.Vector2()
  const pointers = new Map()

  let gestureMoved = false
  let usedMultiplePointers = false
  let pinchStartDistance = 0
  let pinchStartScale = initialScale

  const getTransform = () => ({
    scale: transformRoot.scale.x,
    rotationDegrees: {
      x: THREE.MathUtils.radToDeg(transformRoot.rotation.x),
      y: THREE.MathUtils.radToDeg(transformRoot.rotation.y),
      z: THREE.MathUtils.radToDeg(transformRoot.rotation.z),
    },
  })

  const emitTransform = () => {
    const transform = getTransform()
    onTransform?.(transform)
    return transform
  }

  const setTransform = ({scale = initialScale, rotationDegrees = initialRotationDegrees} = {}) => {
    // setScalar 很重要：x/y/z 必須使用相同倍率，否則模型會被壓扁。
    transformRoot.scale.setScalar(THREE.MathUtils.clamp(scale, minScale, maxScale))
    transformRoot.rotation.set(
      THREE.MathUtils.degToRad(rotationDegrees.x || 0),
      THREE.MathUtils.degToRad(rotationDegrees.y || 0),
      THREE.MathUtils.degToRad(rotationDegrees.z || 0),
      'YXZ',
    )
    return emitTransform()
  }

  const reset = () => setTransform({
    scale: initialScale,
    rotationDegrees: initialRotationDegrees,
  })

  const raycastTap = (event) => {
    if (!characterRoot.visible) return

    const bounds = canvas.getBoundingClientRect()
    normalizedPointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
    normalizedPointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
    raycaster.setFromCamera(normalizedPointer, camera)

    // GLB 會有多層 Group，所以 recursive 必須是 true。
    const hit = raycaster.intersectObject(characterRoot, true)
      .find(({object}) => object.userData.isCharacter)
    if (hit) onTap?.({hit, characterRoot})
  }

  const handlePointerDown = (event) => {
    if (!characterRoot.visible) return

    canvas.setPointerCapture?.(event.pointerId)
    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
    })

    if (pointers.size === 1) {
      gestureMoved = false
      usedMultiplePointers = false
    } else if (pointers.size === 2) {
      // 兩指剛落下時記住距離與原始大小；後續只計算比例，不會突然跳尺寸。
      usedMultiplePointers = true
      pinchStartDistance = pointerDistance([...pointers.values()])
      pinchStartScale = transformRoot.scale.x
    }
  }

  const handlePointerMove = (event) => {
    const pointer = pointers.get(event.pointerId)
    if (!pointer) return

    const deltaX = event.clientX - pointer.lastX
    const deltaY = event.clientY - pointer.lastY
    pointer.x = event.clientX
    pointer.y = event.clientY
    pointer.lastX = event.clientX
    pointer.lastY = event.clientY

    const totalDistance = Math.hypot(
      event.clientX - pointer.startX,
      event.clientY - pointer.startY,
    )

    // Image Target 模式仍允許短按播放動畫，但只有 camera-lock 模式可旋轉／縮放。
    if (!isManipulationEnabled()) {
      if (totalDistance > TAP_MOVE_THRESHOLD_PX) gestureMoved = true
      return
    }

    event.preventDefault?.()

    if (pointers.size === 1) {
      if (totalDistance <= TAP_MOVE_THRESHOLD_PX && !gestureMoved) return
      gestureMoved = true

      const speed = THREE.MathUtils.degToRad(rotationSpeedDegrees)
      transformRoot.rotation.y = normalizeYaw(transformRoot.rotation.y + deltaX * speed)
      transformRoot.rotation.x = THREE.MathUtils.clamp(
        transformRoot.rotation.x + deltaY * speed,
        THREE.MathUtils.degToRad(minPitchDegrees),
        THREE.MathUtils.degToRad(maxPitchDegrees),
      )
      emitTransform()
      return
    }

    if (pointers.size === 2 && pinchStartDistance > 0) {
      const currentDistance = pointerDistance([...pointers.values()])
      if (Math.abs(currentDistance - pinchStartDistance) > PINCH_MOVE_THRESHOLD_PX) {
        gestureMoved = true
      }
      const nextScale = pinchStartScale * (currentDistance / pinchStartDistance)
      transformRoot.scale.setScalar(THREE.MathUtils.clamp(nextScale, minScale, maxScale))
      emitTransform()
    }
  }

  const finishPointer = (event, allowTap) => {
    if (!pointers.has(event.pointerId)) return

    const wasOnlyPointer = pointers.size === 1
    const shouldTap = allowTap && wasOnlyPointer && !gestureMoved && !usedMultiplePointers
    pointers.delete(event.pointerId)
    canvas.releasePointerCapture?.(event.pointerId)

    if (shouldTap) raycastTap(event)

    if (pointers.size === 0) {
      gestureMoved = false
      usedMultiplePointers = false
      pinchStartDistance = 0
    } else {
      // 一指先離開雙指手勢後，不把剩下那指誤判成點擊。
      usedMultiplePointers = true
    }
  }

  const handlePointerUp = (event) => finishPointer(event, true)
  const handlePointerCancel = (event) => finishPointer(event, false)

  canvas.addEventListener('pointerdown', handlePointerDown)
  canvas.addEventListener('pointermove', handlePointerMove)
  canvas.addEventListener('pointerup', handlePointerUp)
  canvas.addEventListener('pointercancel', handlePointerCancel)
  setTransform()

  return {
    getTransform,
    setTransform,
    reset,
    dispose() {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointercancel', handlePointerCancel)
      pointers.clear()
    },
  }
}
