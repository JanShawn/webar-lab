import {describe, expect, it, vi} from 'vitest'
import {createARProvider} from '~/ar/core/createARProvider'
import {createTrackingPose} from '~/ar/core/trackingTypes'
import {create8thWallProvider} from '~/ar/providers/8thwall/index.client'
import {createXrControllerConfiguration} from '~/ar/providers/8thwall/configuration'
import {create8thWallImageTrackingModule} from '~/ar/providers/8thwall/imageTracking.client'
import {createScene} from '~/3d/createScene.client'
import {createImageModelController} from '~/experiences/image-scan/createImageModelController.client'
import {useARSession} from '~/composables/useARSession'
import * as THREE from 'three'

const createValidProvider = () => ({
  load: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  isSupported: vi.fn(),
  getCameraPose: vi.fn(),
  onReady: vi.fn(),
  onError: vi.fn(),
  onImageFound: vi.fn(),
  onImageUpdated: vi.fn(),
  onImageLost: vi.fn(),
  onSurfaceFound: vi.fn(),
  onPlacementUpdated: vi.fn(),
})

describe('AR provider contract', () => {
  it('accepts a provider that implements the shared interface', () => {
    const provider = createValidProvider()
    expect(createARProvider(provider)).toBe(provider)
  })

  it('reports missing methods when adding an incomplete provider', () => {
    expect(() => createARProvider({start: vi.fn()})).toThrow(/stop/)
  })

  it('keeps the XR8 implementation behind the same contract', () => {
    expect(() => create8thWallProvider({mode: 'world', three: {}})).not.toThrow()
  })
})

describe('tracking pose', () => {
  it('normalizes missing values without exposing provider-specific fields', () => {
    expect(createTrackingPose({position: {x: 2}, rotation: {w: 0.5}, scale: '2'})).toEqual({
      position: {x: 2, y: 0, z: 0},
      rotation: {x: 0, y: 0, z: 0, w: 0.5},
      scale: 2,
      raw: null,
    })
  })
})

describe('Three.js content scene', () => {
  it('owns and disposes only its content root', () => {
    const baseScene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera()
    const renderer = {name: 'provider-owned-renderer'}
    const runtime = createScene({renderContext: {scene: baseScene, camera, renderer}})

    expect(baseScene.getObjectByName('webar-content-root')).toBe(runtime.contentRoot)
    expect(typeof useARSession).toBe('function')
    runtime.dispose()
    expect(baseScene.getObjectByName('webar-content-root')).toBeUndefined()
  })

  it('moves the same character anchor from image space to camera space', () => {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera()
    scene.add(camera)
    const contentRoot = new THREE.Group()
    scene.add(contentRoot)
    const modelRoot = new THREE.Group()
    const character = createImageModelController({
      scene,
      camera,
      contentRoot,
      modelRoot,
      config: {
        targetTransform: {},
        cameraTransform: {
          position: {x: 0, y: 0.6, z: -0.7},
          rotationDegrees: {x: 58},
          scale: 0.8,
        },
      },
    })

    character.attachToTarget({
      position: {x: 1, y: 2, z: 3},
      rotation: {x: 0, y: 0, z: 0, w: 1},
      scale: 1,
    })
    expect(character.root.parent).toBe(contentRoot)
    character.attachToCamera()
    expect(character.root.parent).toBe(camera)
    expect(character.getDisplayMode()).toBe('camera-lock')
  })
})

describe('8th Wall image event bridge', () => {
  it('does not request metric scale while image mode has world tracking disabled', () => {
    expect(createXrControllerConfiguration('image')).toMatchObject({
      disableWorldTracking: true,
      scale: 'responsive',
    })
    expect(createXrControllerConfiguration('world')).toMatchObject({
      disableWorldTracking: false,
      scale: 'absolute',
    })
  })

  it('normalizes imagefound before notifying the app', () => {
    const onFound = vi.fn()
    const module = create8thWallImageTrackingModule({
      onFound,
      onUpdated: vi.fn(),
      onLost: vi.fn(),
    })
    module.listeners.find(({event}) => event === 'reality.imagefound').process({
      detail: {
        name: 'postcard-area1',
        position: {x: 1, y: 2, z: 3},
        rotation: {x: 0, y: 0, z: 0, w: 1},
        scale: 0.5,
        scaledWidth: 1,
        scaledHeight: 1.4,
      },
    })

    expect(onFound).toHaveBeenCalledWith(expect.objectContaining({
      id: 'postcard-area1',
      scale: 0.5,
      dimensions: {width: 1, height: 1.4},
    }))
  })
})
