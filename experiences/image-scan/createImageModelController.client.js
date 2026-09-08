/**
 * [POC 行為｜依需求改]
 * 這是 Image POC 特有的 anchor 切換，不是 8th Wall API。
 * 它只接收整理好的 target pose，因此未來換 MindAR 時仍可保留。
 */
import * as THREE from 'three'
import {disposeObjectTree} from '~/3d/modelLoader/loadCharacter.client'

const setEulerDegrees = (object, rotation = {}) => {
  object.rotation.set(
    THREE.MathUtils.degToRad(rotation.x || 0),
    THREE.MathUtils.degToRad(rotation.y || 0),
    THREE.MathUtils.degToRad(rotation.z || 0),
  )
}

/**
 * POC 特有邏輯：控制模型要掛在「圖片座標」還是「相機座標」。
 * 相機、XR8 event 與 GLB 載入都不在這裡處理，因此未來容易替換 provider 或素材。
 */
export const createImageModelController = ({scene, camera, contentRoot, modelRoot, config}) => {
  const anchor = new THREE.Group()
  anchor.name = 'image-ar-anchor'
  anchor.visible = false

  // placementPivot 只處理「案件預設的位置與角度」。
  // gesturePivot 只處理「使用者拖曳／縮放」。兩層分開後，調整 config 不會覆蓋手勢。
  const placementPivot = new THREE.Group()
  placementPivot.name = 'image-ar-placement-pivot'
  const gesturePivot = new THREE.Group()
  gesturePivot.name = 'image-ar-gesture-pivot'
  gesturePivot.add(modelRoot)
  placementPivot.add(gesturePivot)
  anchor.add(placementPivot)
  contentRoot.add(anchor)
  let displayMode = 'hidden'

  const applyPlacementTransform = (transform) => {
    const position = transform?.position || {}
    placementPivot.position.set(position.x || 0, position.y || 0, position.z || 0)
    setEulerDegrees(placementPivot, transform?.rotationDegrees)
  }

  return {
    root: anchor,
    // 手勢 controller 只會改這一層，不直接碰 image anchor。
    gestureRoot: gesturePivot,
    getDisplayMode: () => displayMode,

    attachToTarget(target) {
      // 核心概念：image found/updated 後套用 provider 正規化過的 pose。
      contentRoot.add(anchor)
      anchor.position.set(target.position.x, target.position.y, target.position.z)
      anchor.quaternion.set(target.rotation.x, target.rotation.y, target.rotation.z, target.rotation.w)
      anchor.scale.setScalar(target.scale || 1)
      applyPlacementTransform(config.targetTransform)
      anchor.visible = true
      displayMode = 'image-target'
    },

    attachToCamera() {
      // 客製行為：失焦後改掛在 camera 下，模型便會固定跟著手機畫面。
      if (!camera.parent) scene.add(camera)
      camera.add(anchor)
      const transform = config.cameraTransform
      anchor.position.set(transform.position.x, transform.position.y, transform.position.z)
      setEulerDegrees(anchor, {x: 0, y: 0, z: 0})
      anchor.scale.setScalar(transform.scale || 1)
      applyPlacementTransform({position: {x: 0, y: 0, z: 0}, rotationDegrees: transform.rotationDegrees})
      anchor.visible = true
      displayMode = 'camera-lock'
    },

    hide() {
      anchor.visible = false
      displayMode = 'hidden'
    },

    dispose() {
      anchor.removeFromParent()
      disposeObjectTree(modelRoot)
      anchor.clear()
    },
  }
}
