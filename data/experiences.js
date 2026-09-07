/**
 * @typedef {Object} ExperienceDefinition
 * @property {string} id
 * @property {string} slug
 * @property {string} title
 * @property {string} category
 * @property {string} engine
 * @property {string[]} capabilities
 * @property {'ready'|'planned'} status
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
    route: '/experiences/spatial-hunt',
  },
]
