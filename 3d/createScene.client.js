/**
 * [Three.js 共用｜通常不改]
 * 從 tracking provider 取得 scene/camera/renderer 後，建立我們自己的內容根節點與燈光。
 * 只清理由本專案加入的 3D 資源，不處理 XR8 相機。
 */
import * as THREE from 'three'

const disposeMaterial = (material) => {
  if (!material) return
  Object.values(material).forEach((value) => {
    if (value?.isTexture) value.dispose()
  })
  material.dispose?.()
}

/**
 * 3D layer 只接收標準 Three.js render context，不知道它來自 XR8、MindAR 或 WebXR。
 * provider 擁有 renderer / camera；這裡只管理 WebAR Lab 自己加入的內容。
 */
export const createScene = ({renderContext}) => {
  const {scene, camera, renderer} = renderContext || {}
  if (!scene || !camera || !renderer) throw new Error('缺少 Three.js render context')

  renderer.outputColorSpace = THREE.SRGBColorSpace

  // 共用核心：所有「我們建立的物件」都放在 contentRoot，cleanup 時才能一次清乾淨。
  const contentRoot = new THREE.Group()
  contentRoot.name = 'webar-content-root'
  scene.add(contentRoot)

  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x34443c, 1.6)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8)
  directionalLight.position.set(2, 4, 2)
  contentRoot.add(hemisphereLight, directionalLight)

  return {
    scene,
    camera,
    renderer,
    contentRoot,

    dispose() {
      contentRoot.traverse((object) => {
        object.geometry?.dispose?.()
        if (Array.isArray(object.material)) object.material.forEach(disposeMaterial)
        else disposeMaterial(object.material)
      })
      contentRoot.removeFromParent()
      contentRoot.clear()
    },
  }
}
