/**
 * [Three.js 共用｜換模型時通常不改]
 * 使用 GLTFLoader 下載 GLB、統一模型尺寸、標記可點擊 mesh，並提供 dispose。
 */
import * as THREE from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js'

const normalizeModelSize = (root, maxSize) => {
  // 共用核心：不同 GLB 原始單位可能差很多，先縮放到 config 指定的最大尺寸。
  const bounds = new THREE.Box3().setFromObject(root)
  const size = bounds.getSize(new THREE.Vector3())
  const scale = maxSize / Math.max(size.x, size.y, size.z, 0.001)
  root.scale.multiplyScalar(scale)

  const scaledBounds = new THREE.Box3().setFromObject(root)
  const center = scaledBounds.getCenter(new THREE.Vector3())
  root.position.set(-center.x, -scaledBounds.min.y, -center.z)
}

export const disposeObjectTree = (root) => {
  const geometries = new Set()
  const materials = new Set()

  root?.traverse?.((object) => {
    if (object.geometry) geometries.add(object.geometry)
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
    objectMaterials.filter(Boolean).forEach((material) => materials.add(material))
  })

  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => {
    Object.values(material).forEach((value) => value?.isTexture && value.dispose())
    material.dispose()
  })
}

/**
 * 只負責 GLB 載入與尺寸正規化，不知道模型要跟圖片還是世界座標。
 */
export const loadCharacter = async ({modelUrl, maxSize = 0.7}) => {
  // 客製時通常只換 modelUrl；載入、標記可點擊 mesh 與 dispose 流程可保留。
  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  const gltf = await loader.loadAsync(modelUrl)
  const root = gltf.scene
  root.name = 'image-ar-character'
  normalizeModelSize(root, maxSize)
  root.traverse((object) => {
    if (!object.isMesh) return
    object.userData.isCharacter = true
    object.frustumCulled = false
  })

  return {
    root,
    animations: gltf.animations,
    dispose: () => disposeObjectTree(root),
  }
}
