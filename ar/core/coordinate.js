import {createQuaternion, createVector3} from './trackingTypes'

/**
 * WebAR Lab 的共用座標約定：右手座標、Y 軸向上、單位為公尺。
 * 這與 Three.js 預設一致；各 provider 必須在自己的邊界完成轉換。
 */
export const toCanonicalTransform = ({position, rotation, scale = 1} = {}) => ({
  position: createVector3(position),
  rotation: createQuaternion(rotation),
  scale: Number.isFinite(Number(scale)) ? Number(scale) : 1,
})
