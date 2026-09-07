/**
 * [Three.js 共用｜通常不改]
 * 將手機點擊座標轉成 Raycaster，命中模型後才呼叫頁面提供的 onClick。
 */
import * as THREE from 'three'

export const createCharacterInteraction = ({canvas, camera, characterRoot, onClick}) => {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  const handlePointerUp = (event) => {
    if (!characterRoot.visible) return
    const bounds = canvas.getBoundingClientRect()
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)

    // 共用核心：把螢幕點擊轉成 3D 射線，只在真的擊中模型 mesh 時觸發客製 callback。
    const hit = raycaster.intersectObject(characterRoot, true)
      .find(({object}) => object.userData.isCharacter)
    if (hit) onClick?.({hit, characterRoot})
  }

  canvas.addEventListener('pointerup', handlePointerUp)
  return {
    dispose: () => canvas.removeEventListener('pointerup', handlePointerUp),
  }
}
