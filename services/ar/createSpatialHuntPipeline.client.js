import * as THREE from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js'
import {spatialHuntConfig} from '~/experiences/spatial-hunt/config'

const collectDurationMs = spatialHuntConfig.crystal.collectDurationMs

// 每顆晶體是一個 Group：實心 core、線框 glow 和 Points 粒子共用相同 targetId。
// Raycaster 命中任何子物件後，都能回推到同一顆晶體。
const createCrystal = (index) => {
  const group = new THREE.Group()
  const id = `crystal-${index + 1}`
  group.name = id
  group.userData = {targetId: id, baseY: 0, floatOffset: 0, rotationSpeed: 0.8, collectedAt: null}

  const glowMaterial = new THREE.MeshStandardMaterial({
    color: 0x84f7b2,
    emissive: 0x38b974,
    emissiveIntensity: 1.8,
    roughness: 0.22,
    metalness: 0.08,
  })
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.105, 0), glowMaterial)
  core.castShadow = true
  core.userData.targetId = id

  const wire = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.145, 0),
    new THREE.MeshBasicMaterial({color: 0xc7ffe0, wireframe: true, transparent: true, opacity: 0.65}),
  )
  wire.userData.targetId = id

  const particlePositions = new Float32Array(36)
  for (let offset = 0; offset < particlePositions.length; offset += 3) {
    const angle = (offset / 3 / 12) * Math.PI * 2
    const radius = 0.18 + (offset % 2) * 0.025
    particlePositions[offset] = Math.cos(angle) * radius
    particlePositions[offset + 1] = ((offset / 3) % 3 - 1) * 0.065
    particlePositions[offset + 2] = Math.sin(angle) * radius
  }
  const particlesGeometry = new THREE.BufferGeometry()
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
  const particles = new THREE.Points(
    particlesGeometry,
    new THREE.PointsMaterial({color: 0x73d8ff, size: 0.025, transparent: true, opacity: 0.8}),
  )

  group.add(core, wire, particles)
  group.userData.hitMeshes = [core, wire]
  group.userData.particles = particles
  return group
}

const disposeTree = (root) => {
  // Three.js 不會自動釋放 GPU geometry、material 和 texture。
  // route 離開時集中 dispose，避免多次進出 AR 頁面後記憶體持續增加。
  const geometries = new Set()
  const materials = new Set()

  root?.traverse?.((object) => {
    if (object.geometry) geometries.add(object.geometry)
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
    objectMaterials.filter(Boolean).forEach((material) => materials.add(material))
  })

  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => {
    Object.values(material).forEach((value) => value?.isTexture && value.dispose())
    material.dispose()
  })
}

const normalizeModel = (model, targetSize = spatialHuntConfig.rover.modelSizeMeters) => {
  // 不依賴 GLB 原始單位：先量 bounding box，再統一縮放並把模型底部貼到 y = 0。
  const bounds = new THREE.Box3().setFromObject(model)
  const size = bounds.getSize(new THREE.Vector3())
  const scale = targetSize / Math.max(size.x, size.y, size.z, 0.001)
  model.scale.multiplyScalar(scale)

  const scaledBounds = new THREE.Box3().setFromObject(model)
  const center = scaledBounds.getCenter(new THREE.Vector3())
  model.position.x -= center.x
  model.position.y -= scaledBounds.min.y
  model.position.z -= center.z
}

/**
 * Owns only Three.js scene content and hit testing. Vue and Pinia own the game flow.
 */
export const createSpatialHuntPipeline = ({
  assetUrl = '/models/toy-car.glb',
  onCollect = () => {},
  onSceneReady = () => {},
  onModelLoad = () => {},
  onFps = () => {},
} = {}) => {
  let scene = null
  let camera = null
  let renderer = null
  let ground = null
  let worldRoot = null
  let roverContainer = null
  let roverPlaceholder = null
  let crystalGroups = []
  let hitMeshes = []
  let disposed = false
  let roundActive = false
  let roverScale = 1
  let frameCount = 0
  let fpsWindowStartedAt = 0

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  const setPointerFromScreen = (clientX, clientY) => {
    // DOM 像素座標要先轉成 Three.js 的 Normalized Device Coordinates（-1 到 1），
    // 才能從相機往場景發射 ray。
    const canvas = renderer.domElement
    const bounds = canvas.getBoundingClientRect()
    pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1
    pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
  }

  const createSceneContent = () => {
    // worldRoot 是玩家點地面後建立的「任務中心」。車子和五顆晶體都掛在它下面，
    // 因此重新定位只要移動這個 root，不必逐一重算世界座標。
    worldRoot = new THREE.Group()
    worldRoot.name = 'spatial-hunt-world'
    worldRoot.visible = false

    roverContainer = new THREE.Group()
    roverContainer.name = 'rover-container'

    roverPlaceholder = new THREE.Group()
    const placeholderBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.18, 0.3),
      new THREE.MeshStandardMaterial({color: 0x172a21, emissive: 0x0b2518, roughness: 0.45, metalness: 0.65}),
    )
    placeholderBody.position.y = 0.1
    placeholderBody.castShadow = true
    const placeholderCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.09, 0),
      new THREE.MeshBasicMaterial({color: 0x84f7b2}),
    )
    placeholderCore.position.y = 0.28
    roverPlaceholder.add(placeholderBody, placeholderCore)
    roverContainer.add(roverPlaceholder)

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.37, 0.39, 72),
      new THREE.MeshBasicMaterial({color: 0x84f7b2, transparent: true, opacity: 0.58, side: THREE.DoubleSide}),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.012
    ring.name = 'rover-energy-ring'
    roverContainer.add(ring)

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4),
      new THREE.ShadowMaterial({opacity: 0.22}),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.004
    shadow.receiveShadow = true

    crystalGroups = Array.from({length: spatialHuntConfig.targetCount}, (_, index) => createCrystal(index))
    hitMeshes = crystalGroups.flatMap((group) => group.userData.hitMeshes)
    crystalGroups.forEach((group) => worldRoot.add(group))

    worldRoot.add(roverContainer, shadow)
    scene.add(worldRoot)

    ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide}),
    )
    ground.rotation.x = -Math.PI / 2
    ground.name = 'placement-ground'
    scene.add(ground)
  }

  const loadRover = async () => {
    const startedAt = performance.now()
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)

    try {
      const gltf = await loader.loadAsync(assetUrl)
      if (disposed) {
        disposeTree(gltf.scene)
        return
      }
      const rover = gltf.scene
      normalizeModel(rover)
      rover.rotation.y = Math.PI
      rover.traverse((object) => {
        if (object.isMesh) {
          object.castShadow = true
          object.receiveShadow = true
        }
      })
      roverPlaceholder.visible = false
      roverContainer.add(rover)
      onModelLoad({status: 'ready', durationMs: performance.now() - startedAt})
    } catch (error) {
      onModelLoad({status: 'fallback', durationMs: performance.now() - startedAt, error})
    }
  }

  const update = ({processCpuResult}) => {
    if (disposed) return
    const now = performance.now()
    const seconds = now / 1000

    const reality = processCpuResult?.reality
    if (reality?.lighting && renderer) {
      renderer.toneMappingExposure = THREE.MathUtils.clamp(reality.lighting.exposure || 1, 0.72, 1.35)
    }

    if (worldRoot?.visible) {
      // 動畫使用絕對時間，而不是累加固定 frame delta；FPS 降低時仍維持接近相同速度。
      const ring = roverContainer.getObjectByName('rover-energy-ring')
      if (ring) {
        ring.rotation.z = seconds * 0.35
        ring.material.opacity = 0.46 + Math.sin(seconds * 2) * 0.1
      }

      crystalGroups.forEach((group) => {
        const data = group.userData
        if (data.collectedAt !== null) {
          const progress = Math.min(1, (now - data.collectedAt) / collectDurationMs)
          const scale = Math.max(0, 1 - progress)
          group.scale.setScalar(scale)
          data.particles.scale.setScalar(1 + progress * 2.6)
          if (progress >= 1) group.visible = false
          return
        }

        group.rotation.y += data.rotationSpeed * 0.016
        group.rotation.x = Math.sin(seconds * 0.8 + data.floatOffset) * 0.18
        group.position.y = data.baseY + Math.sin(seconds * 1.6 + data.floatOffset) * 0.045
        data.particles.rotation.y = -seconds * 0.45
      })
    }

    frameCount += 1
    if (!fpsWindowStartedAt) fpsWindowStartedAt = now
    const elapsed = now - fpsWindowStartedAt
    if (elapsed >= 750) {
      onFps(Math.round((frameCount * 1000) / elapsed))
      frameCount = 0
      fpsWindowStartedAt = now
    }
  }

  const dispose = () => {
    if (disposed) return
    disposed = true
    roundActive = false
    disposeTree(worldRoot)
    disposeTree(ground)
    if (worldRoot?.parent) worldRoot.parent.remove(worldRoot)
    if (ground?.parent) ground.parent.remove(ground)
    crystalGroups = []
    hitMeshes = []
    scene = null
    camera = null
    renderer = null
  }

  const module = {
    // XR8 每幀會呼叫這個 pipeline module；onStart 只建立一次場景，onUpdate 負責動畫。
    name: 'spatial-hunt-scene',
    onStart: () => {
      const xrScene = window.XR8.Threejs.xrScene()
      scene = xrScene.scene
      camera = xrScene.camera
      renderer = xrScene.renderer
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.outputColorSpace = THREE.SRGBColorSpace

      scene.add(new THREE.HemisphereLight(0xe9fff2, 0x173126, 1.75))
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.8)
      keyLight.position.set(2.5, 5, 3)
      keyLight.castShadow = true
      keyLight.shadow.mapSize.set(1024, 1024)
      scene.add(keyLight)

      camera.position.set(0, 1.6, 2.4)
      window.XR8.XrController.updateCameraProjectionMatrix({
        origin: camera.position,
        facing: camera.quaternion,
      })

      createSceneContent()
      loadRover()
      onSceneReady()
    },
    onUpdate: update,
    onDetach: dispose,
    onRemove: dispose,
  }

  return {
    module,

    placeAtScreen(clientX, clientY) {
      if (!scene || !camera || !renderer || disposed) return false
      setPointerFromScreen(clientX, clientY)
      // 首版用 y = 0 的透明平面作放置面；使用者點擊處與它相交的位置就是任務中心。
      const intersection = raycaster.intersectObject(ground, false)[0]
      if (!intersection) return false

      worldRoot.position.copy(intersection.point)
      worldRoot.rotation.y = Math.atan2(
        camera.position.x - intersection.point.x,
        camera.position.z - intersection.point.z,
      )
      worldRoot.visible = true
      return true
    },

    beginRound(layout) {
      if (!worldRoot || disposed) return false
      layout.forEach((slot, index) => {
        const group = crystalGroups[index]
        if (!group) return
        group.visible = true
        group.scale.setScalar(1)
        group.position.set(slot.position.x, slot.position.y, slot.position.z)
        group.userData.baseY = slot.position.y
        group.userData.floatOffset = slot.floatOffset
        group.userData.rotationSpeed = slot.rotationSpeed
        group.userData.collectedAt = null
        group.userData.particles.scale.setScalar(1)
      })
      roundActive = true
      return true
    },

    setRoverScale(scale) {
      // 只縮放車體，不縮放 worldRoot，避免改變晶體 0.8–1.5 公尺的遊戲距離。
      roverScale = THREE.MathUtils.clamp(
        Number(scale) || 1,
        spatialHuntConfig.rover.minScale,
        spatialHuntConfig.rover.maxScale,
      )
      roverContainer?.scale.setScalar(roverScale)
      return roverScale
    },

    getRoverScale() {
      return roverScale
    },

    collectAtScreen(clientX, clientY) {
      if (!roundActive || !scene || !camera || !renderer || disposed) return false
      setPointerFromScreen(clientX, clientY)
      const intersection = raycaster.intersectObjects(hitMeshes, false).find((hit) => hit.object.visible !== false)
      const targetId = intersection?.object?.userData?.targetId
      if (!targetId) return false

      const target = crystalGroups.find((group) => group.userData.targetId === targetId)
      if (!target || target.userData.collectedAt !== null) return false
      target.userData.collectedAt = performance.now()
      onCollect(targetId)
      return true
    },

    clearPlacement() {
      roundActive = false
      if (worldRoot) worldRoot.visible = false
    },

    dispose,
  }
}
