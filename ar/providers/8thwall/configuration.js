/**
 * [8th Wall 核心設定｜通常不改]
 *
 * Image AR 與 World AR 對尺度的需求不同：
 * - image：關閉 SLAM，只需要追蹤圖片，所以必須使用 responsive。
 * - world：開啟 SLAM，需要以公尺放置物件，所以使用 absolute。
 *
 * 抽成純函式是為了讓這個相容性規則可以直接做單元測試。
 */
export const createXrControllerConfiguration = (mode) => ({
  disableWorldTracking: mode === 'image',
  enableLighting: mode === 'world',
  leftHandedAxes: false,
  // absolute 需要 SLAM 做公尺尺度估算，不能和 disableWorldTracking 同時使用。
  scale: mode === 'image' ? 'responsive' : 'absolute',
})
