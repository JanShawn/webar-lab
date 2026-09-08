/**
 * [素材設定｜最常改]
 * 新客製案先改這裡，不要一開始就進 provider。
 * 圖片、GLB、模型姿勢、失焦行為與動畫名稱都集中在這個 object。
 */
export const imageScanConfig = {
  // 客製入口 1：顯示名稱與 8th Wall target name。
  id: 'postcard-area1',
  title: '小山靈明信片 AR',
  target: {
    // 客製入口 2：換辨識圖時，要一起更換 JSON、luminance 圖與預覽圖。
    name: 'postcard-area1',
    metadataPath: '/experiences/image-scan/targets/postcard-area1.json',
    imagePath: '/experiences/image-scan/targets/postcard-area1_luminance.png',
    previewPath: '/experiences/image-scan/targets/postcard-area1_original.png',
  },
  model: {
    // 客製入口 3：換案件時通常只需要換 GLB 路徑，再微調 maxSize。
    path: '/experiences/image-scan/models/area1-spirit.glb',
    maxSize: 0.72,
    targetTransform: {
      // 客製入口 4：模型相對於實體圖片的位置與角度。
      position: {x: 0, y: 0, z: 0.04},
      rotationDegrees: {x: 90, y: 0, z: 0},
    },
    cameraTransform: {
      // Three.js camera 朝 -Z；Y 與 Z 距離接近，約為相機前上方 45 度。
      position: {x: 0, y: 0.62, z: -0.72},
      rotationDegrees: {x: 58, y: 0, z: 0},
      scale: 0.82,
    },
  },
  tracking: {
    // camera-lock：失焦後固定在相機前；hide：失焦後隱藏模型。
    lostBehavior: 'camera-lock',
  },
  animation: {
    // 客製入口 5：名稱必須與 GLB 內的 Animation Clip 完全相同。
    idle: 'sceneMerge',
    onClick: 'sceneMerge',
  },
}
