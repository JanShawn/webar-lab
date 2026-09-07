/**
 * [8th Wall 邊界｜換 provider 才改]
 * 讀取 CLI 產生的 target data，並把 XR8 image events 轉成專案共用 pose。
 */
import {createTrackingPose} from '../../core/trackingTypes'

export const load8thWallImageTargetData = async ({metadataUrl, imageUrl}) => {
  const response = await fetch(metadataUrl)
  if (!response.ok) {
    throw Object.assign(new Error(`無法載入 Image Target：${response.status}`), {code: 'IMAGE_TARGET_UNAVAILABLE'})
  }

  const targetData = await response.json()
  return {
    ...targetData,
    // CLI 產生的是輸出資料夾用的相對路徑；Web 專案必須改成實際公開 URL。
    imagePath: imageUrl,
  }
}

const normalizeImageTarget = (detail = {}) => ({
  id: detail.name || 'unknown-target',
  name: detail.name || 'unknown-target',
  ...createTrackingPose({
    position: detail.position,
    rotation: detail.rotation,
    scale: detail.scale,
    raw: detail,
  }),
  dimensions: {
    width: Number(detail.scaledWidth) || 0,
    height: Number(detail.scaledHeight) || 0,
  },
})

/**
 * 將 8th Wall reality.image* events 轉為 WebAR Lab 的共用 target 格式。
 * 若未來改用 MindAR，請新增另一個 provider 做同樣轉換，不要修改 Vue 頁面。
 */
export const create8thWallImageTrackingModule = ({onFound, onUpdated, onLost}) => ({
  name: 'webar-lab-image-tracking',
  listeners: [
    {
      event: 'reality.imagefound',
      process: ({detail}) => onFound(normalizeImageTarget(detail)),
    },
    {
      event: 'reality.imageupdated',
      process: ({detail}) => onUpdated(normalizeImageTarget(detail)),
    },
    {
      event: 'reality.imagelost',
      process: ({detail}) => onLost(normalizeImageTarget(detail)),
    },
  ],
})
