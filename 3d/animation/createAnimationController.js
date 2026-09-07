/**
 * [Three.js 共用｜動畫規則不同才改]
 * 用 AnimationMixer 播放 GLB 內建動畫；動畫名稱由 experience config 提供。
 */
import * as THREE from 'three'

export const createAnimationController = ({root, animations = [], idleAnimation}) => {
  const mixer = new THREE.AnimationMixer(root)
  const clipsByName = new Map(animations.map((clip) => [clip.name, clip]))
  let currentAction = null

  const play = (name, {restart = false} = {}) => {
    // 找不到指定名稱時先播放 GLB 第一段動畫，避免 POC 完全沒有反應。
    const clip = clipsByName.get(name) || animations[0]
    if (!clip) return false

    const nextAction = mixer.clipAction(clip)
    if (currentAction && currentAction !== nextAction) currentAction.fadeOut(0.15)
    currentAction = nextAction
    if (restart) currentAction.reset()
    currentAction.enabled = true
    currentAction.setLoop(THREE.LoopRepeat, Infinity)
    currentAction.fadeIn(0.15).play()
    return true
  }

  if (idleAnimation) play(idleAnimation)

  return {
    animationNames: animations.map((clip) => clip.name),
    play,
    update: (deltaSeconds) => mixer.update(deltaSeconds),
    dispose() {
      mixer.stopAllAction()
      mixer.uncacheRoot(root)
    },
  }
}
