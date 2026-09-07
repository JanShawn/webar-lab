/**
 * @typedef {Object} ExperienceDefinition
 * @property {string} id
 * @property {string} slug
 * @property {string} title
 * @property {string} category
 * @property {string} engine
 * @property {string[]} capabilities
 * @property {'ready'|'next'|'planned'} status
 * @property {string} description
 * @property {string} route
 */

/** @type {ExperienceDefinition[]} */
export const experiences = [
  {
    id: 'world-001',
    slug: 'spatial-hunt',
    title: '空間能量尋寶',
    category: 'World Tracking',
    engine: '8th Wall SLAM + Three.js',
    capabilities: ['6DoF 空間追蹤', '地面放置', 'Raycasting', '五目標收集'],
    status: 'ready',
    description: '學習相機啟動、SLAM 空間座標、地面放置、模型點擊與 teardown。',
    route: '/experiences/spatial-hunt',
  },
  {
    id: 'image-001',
    slug: 'image-scan',
    title: '圖片掃描與模型互動',
    category: 'Image Tracking',
    engine: 'MindAR + Three.js',
    capabilities: ['指定圖片偵測', 'Image Anchor', '模型顯示', '點擊互動'],
    status: 'next',
    description: '下一個 POC：掃描指定圖片後顯示模型，點擊模型播放客製互動。',
    route: '/experiences/image-scan',
  },
  {
    id: 'face-001',
    slug: 'face-effect',
    title: '臉部追蹤特效',
    category: 'Face Tracking',
    engine: 'To be evaluated',
    capabilities: ['Face Landmark', '頭部姿態', '模型配戴', '前鏡頭'],
    status: 'planned',
    description: '理解 face anchor，將眼鏡、帽子或其他效果固定在臉部特徵點。',
    route: '/experiences/face-effect',
  },
  {
    id: 'location-001',
    slug: 'location-ar',
    title: '地理位置 AR',
    category: 'Location Based',
    engine: 'To be evaluated',
    capabilities: ['Geolocation', 'Compass', '距離計算', '位置提示'],
    status: 'planned',
    description: '理解 GPS 與方向感測器，將內容與真實地點建立關聯。',
    route: '/experiences/location-ar',
  },
]
