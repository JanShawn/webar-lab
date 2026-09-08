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
    // preview 使用未旋轉的原始橫圖；CLI 的 *_original.png 可能為了辨識被轉成直式。
    previewPath: '/experiences/image-scan/targets/postcard-area1_preview.png',
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
      // 相機看向 -Z：z 越負越遠；y 負值會讓模型落在畫面中央稍下方。
      // x 旋轉 35 度會露出模型上方，形成斜上觀看，而不是把模型本身移到畫面上方。
      position: {x: 0, y: -0.16, z: -1.05},
      rotationDegrees: {x: 35, y: 0, z: 0},
      scale: 1,
    },
    gestures: {
      // 客製入口 5：相機展示模式的單指旋轉與雙指縮放範圍。
      initialScale: 1,
      initialRotationDegrees: {x: 0, y: 0, z: 0},
      minScale: 0.55,
      maxScale: 1.8,
      rotationSpeedDegrees: 0.35,
      minPitchDegrees: -35,
      maxPitchDegrees: 55,
    },
  },
  tracking: {
    // camera-lock：失焦後固定在相機前；hide：失焦後隱藏模型。
    lostBehavior: 'camera-lock',
  },
  animation: {
    // 客製入口 6：名稱必須與 GLB 內的 Animation Clip 完全相同。
    idle: 'sceneMerge',
    onClick: 'sceneMerge',
  },
}
