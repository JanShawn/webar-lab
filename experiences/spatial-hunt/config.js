/**
 * 空間尋寶的「客製化入口」。
 *
 * 建立相似 POC 時，優先複製並修改這個檔案；只有互動規則真的不同，
 * 才需要進一步修改 store 或 Three.js pipeline。
 */
export const spatialHuntConfig = Object.freeze({
  /** public/ 底下的模型路徑，不要以 / 開頭，才能支援 GitHub Pages 子路徑。 */
  modelPath: 'experiences/spatial-hunt/models/toy-car.glb',

  /** 一局需要收集的晶體數量。 */
  targetCount: 5,

  /** 晶體相對於任務中心的實際公尺範圍。 */
  spawn: {
    arcDegrees: 240,
    minRadiusMeters: 0.8,
    maxRadiusMeters: 1.5,
    minHeightMeters: 0.25,
    maxHeightMeters: 1.1,
  },

  rover: {
    /** 載入 GLB 後正規化的最長邊，單位是公尺。 */
    modelSizeMeters: 0.64,
    /** 使用者雙指縮放的上下限。 */
    minScale: 0.55,
    maxScale: 1.8,
  },

  crystal: {
    /** 點擊晶體後，縮小與粒子爆發動畫的長度。 */
    collectDurationMs: 420,
  },
})
