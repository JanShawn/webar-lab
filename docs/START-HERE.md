# WebAR POC 入門與客製指南

這是本專案唯一的學習主文件。你不需要先會 AR，也不需要一次讀完所有程式。

先記住目標：

> 這份 POC 證明「瀏覽器能辨識指定圖片、顯示 GLB、圖片失焦後把模型固定在相機前、點擊模型播放動畫」。

後續客製通常只換圖片、GLB、位置、動畫和點擊後行為，不需要重寫相機與 tracking 核心。

---

## 第一課：WebAR 到底由誰負責什麼

WebAR 不是只有相機，也不是只有 Three.js。這個專案把工作分成四層：

| 層級 | 白話解釋 | 本專案使用 |
| --- | --- | --- |
| Nuxt / Vue | 顯示按鈕、提示、loading、錯誤畫面 | Nuxt 4、Vue 3 |
| AR Tracking | 看相機畫面，算出指定圖片的位置與角度 | 8th Wall |
| 3D Rendering | 載入並畫出 GLB、播放動畫、處理點擊 | Three.js |
| POC 規則 | 決定辨識成功或失焦後要做什麼 | `experiences/image-scan/` |

資料流如下：

```text
使用者按「開啟相機」
        ↓
8th Wall 取得相機畫面
        ↓
8th Wall 找到指定圖片，回傳圖片的位置與角度
        ↓
Three.js 把 GLB 放到該位置
        ↓
Vue 顯示「辨識成功」或錯誤提示
```

重要觀念：

- 相機只提供影像，不知道圖片或地板在哪裡。
- 8th Wall 負責 tracking，不負責你的商業互動。
- Three.js 負責畫 3D，不負責開相機權限。
- Vue 負責畫面和流程，不應直接操作大量 `XR8.xxx`。

---

## 第二課：專案目錄怎麼分類

先只看下面這些。學 Image AR 時，可以暫時忽略 `spatial-hunt`、`stores/` 和 `services/ar/`，它們屬於較早完成的空間尋寶 POC。

```text
pages/
└─ experiences/
   └─ image-scan.vue

experiences/
└─ image-scan/
   ├─ config.js
   └─ createImageModelController.client.js

composables/
├─ useARSession.js
└─ useImageTracking.js

ar/
├─ core/
│  ├─ createARProvider.js
│  ├─ trackingTypes.js
│  ├─ coordinate.js
│  └─ errors.js
└─ providers/
   └─ 8thwall/
      ├─ index.client.js
      ├─ session.client.js
      ├─ imageTracking.client.js
      └─ scriptLoader.client.js

3d/
├─ createScene.client.js
├─ modelLoader/loadCharacter.client.js
├─ animation/createAnimationController.js
└─ interaction/createCharacterInteraction.client.js

components/ar/
└─ Canvas.client.vue

public/ar/image-scan/
├─ targets/
└─ models/
```

### 為什麼不把所有檔案放在同一個資料夾

- `pages/` 是 Nuxt 的路由規則，放進去才會產生網址。
- `experiences/image-scan/` 放只有這個 POC 才需要的設定與行為。
- `composables/` 放 Vue 可以重複使用的狀態與 lifecycle。
- `ar/` 放 tracking engine，並隔離 8th Wall 的 `XR8` API。
- `3d/` 放不依賴 8th Wall 的模型、動畫與點擊能力。
- `public/` 放瀏覽器需要用 URL 下載的圖片與 GLB。

這樣未來改用 MindAR 時，主要替換 `ar/providers/`；模型與 Vue UI 不需要全部重寫。

---

## 第三課：這些檔案怎麼來，為什麼需要

### 我們自己寫的程式

| 檔案 | 為什麼需要 | 客製時要改嗎 |
| --- | --- | --- |
| `pages/experiences/image-scan.vue` | Image POC 的 UI 與流程入口 | 會，改文案與互動 |
| `experiences/image-scan/config.js` | 集中圖片、GLB、位置與動畫設定 | 最常修改 |
| `createImageModelController.client.js` | 在圖片 anchor 與相機 anchor 間切換 | 行為不同才改 |
| `useARSession.js` | 統一開始、錯誤、背景暫停與停止 | 通常不改 |
| `useImageTracking.js` | 將 found/updated/lost 變成 Vue 狀態 | 通常不改 |
| `ar/core/` | 統一 provider 介面、pose 與錯誤 | 通常不改 |
| `ar/providers/8thwall/` | 唯一直接使用 XR8 的位置 | 換引擎才改 |
| `3d/` | GLB、動畫、燈光、raycasting、dispose | 新增 3D 能力才改 |
| `components/ar/Canvas.client.vue` | 提供 AR 相機與 Three.js 共用 canvas | 通常不改 |

### 工具產生的 Image Target 檔案

來源是你提供的明信片圖片，使用 8th Wall 官方 CLI 產生：

```bash
npx @8thwall/image-target-cli@latest
```

`public/ar/image-scan/targets/` 內的檔案：

| 檔案 | 用途 |
| --- | --- |
| `postcard-area1.json` | 圖片特徵 metadata，tracking 必要 |
| `postcard-area1_luminance.png` | 引擎辨識用圖片，tracking 必要 |
| `postcard-area1_original.png` | POC 開始畫面的掃描提示圖 |
| `*_cropped.png` | CLI 產生的裁切檢查圖，目前程式未使用 |
| `*_thumbnail.png` | CLI 產生的縮圖，目前程式未使用 |

JSON 和 luminance 圖不是手寫程式，不建議手動修改。換目標圖片時應重新執行 CLI。

### 工具產生的最佳化 GLB

原始模型：

```text
0826_HC_Area1_小山靈.glb：約 6.29 MB
```

瀏覽器實際載入：

```text
public/ar/image-scan/models/area1-spirit.glb：約 1.92 MB
```

它是透過 glTF Transform 產生的最佳化副本：

```bash
npx gltf-transform optimize input.glb output.glb +  --compress quantize +  --flatten false +  --join false +  --simplify false +  --texture-compress webp +  --texture-size 1024
```

原始檔保留在素材來源處；網站只放最佳化後版本。

### 安裝套件產生的檔案

- `node_modules/`：`npm install` 產生，不要複製、不要提交。
- `package-lock.json`：npm 記錄精確版本，應提交。
- `.nuxt/`：Nuxt 開發快取，不要手動修改。
- `.output/`：`npm run build` 或 `npm run generate` 產生，不要手動修改。

### 執行時才從網路載入

`nuxt.config.js` 的 `runtimeConfig.public.ar` 記錄固定版本的：

- 8th Wall Engine Binary
- XRExtras
- Landing Page

首頁不會載入它們；只有進入 AR 頁並按下「開啟相機」後才載入。

---

## 第四課：程式實際怎麼運作

### 步驟 1：Nuxt 產生網址

`pages/experiences/image-scan.vue` 會自動變成：

```text
/experiences/image-scan/
```

頁面用了 client-only route，因為 server 沒有 `window`、`navigator`、相機與 WebGL。

### 步驟 2：Canvas 準備完成

`components/ar/Canvas.client.vue` 在 Vue `onMounted()` 後，把真正的 canvas element 傳給頁面。

```text
Canvas mounted
→ emit('ready', canvas)
→ page 把 canvas 存起來
```

### 步驟 3：使用者按下開啟相機

頁面的 `startExperience()` 呼叫：

```js
session.start({
  canvas,
  mode: 'image',
  providerOptions: {imageTargets: [...]},
})
```

它沒有直接呼叫 `navigator.mediaDevices.getUserMedia()`，因為這次由 8th Wall 管理相機。不要在 Vue 頁再開第二份 camera stream。

### 步驟 4：Session 建立 provider

`useARSession.js` 做以下事情：

```text
status = loading
→ 動態載入 Three.js 與 8th Wall provider
→ provider.load()
→ provider.isSupported()
→ status = requesting-permission
→ provider.start(canvas)
→ 建立 Three.js content scene
→ status = ready / tracking
```

這個 composable 是所有 AR POC 最值得保留的 lifecycle 骨架。

### 步驟 5：8th Wall 啟動相機與 tracking

`ar/providers/8thwall/session.client.js`：

1. 載入 target JSON。
2. 載入 XR8 scripts。
3. 檢查 HTTPS、相機 API 與支援裝置。
4. 設定 `XR8.XrController.configure()`。
5. 加入 camera pipeline modules。
6. 呼叫 `XR8.run({canvas})`。

所有真正的 `XR8.xxx` 都應留在這個 provider 資料夾。

### 步驟 6：辨識圖片

8th Wall 會發出三種事件：

```text
reality.imagefound    第一次找到圖片
reality.imageupdated  持續更新圖片位置
reality.imagelost     暫時看不到圖片
```

`imageTracking.client.js` 將它們整理成專案共用格式：

```js
{
  name: 'postcard-area1',
  position: {x, y, z},
  rotation: {x, y, z, w},
  scale,
}
```

上層只使用這個格式，不需要理解 XR8 的原始 event detail。

### 步驟 7：模型跟著圖片

`createImageModelController.client.js` 的：

```js
attachToTarget(target)
```

會把 target 的 position、rotation、scale 套到 Three.js anchor。

```text
Three.js scene
└─ contentRoot
   └─ image anchor
      └─ modelPivot
         └─ GLB
```

圖片移動時，`imageupdated` 會一直更新 anchor，所以模型看起來貼在圖片上。

### 步驟 8：圖片失焦後固定在相機前

`attachToCamera()` 把同一個 anchor 改掛到 camera：

```text
camera
└─ image anchor
   └─ modelPivot
      └─ GLB
```

因此手機怎麼移動，模型都會保持在畫面前方。位置與約 45 度角由 `config.js` 的 `cameraTransform` 控制。

再次辨識圖片時，`attachToTarget()` 會把 anchor 掛回 scene。

### 步驟 9：點擊模型

`createCharacterInteraction.client.js` 使用 Three.js `Raycaster`：

```text
手機點擊
→ 換算成 Three.js 螢幕座標
→ 從 camera 發射射線
→ 確認是否擊中 GLB mesh
→ 呼叫 page 的 handleCharacterClick()
```

`handleCharacterClick()` 是最重要的客製入口，可播放動畫、顯示 Vue UI 或呼叫 API。

### 步驟 10：離開頁面

`stopExperience()` 會：

1. 移除 pointer listener。
2. 停止 AnimationMixer。
3. dispose GLB、geometry、material、texture。
4. 取消 tracking subscriptions。
5. 呼叫 `useARSession.stop()`。
6. 停止 XR8 與 MediaStream tracks。
7. 移除 pipeline modules。

少了這一步，返回首頁後相機可能還在執行，第二次進入也可能黑屏。

---

## 第五課：第一次閱讀程式的順序

不要從 8th Wall provider 開始。請照這個順序：

### 1. 讀 config

```text
experiences/image-scan/config.js
```

先改一個安全的小地方，例如 `cameraTransform.scale`，觀察模型變大或變小。

### 2. 讀 page 的四個函式

```text
startExperience()
applyTrackedTarget()
handleTargetLost()
stopExperience()
```

先不用讀 template 和 CSS。

### 3. 讀 model controller

```text
attachToTarget()
attachToCamera()
```

理解「模型掛在哪個 parent」就是 anchor 的核心。

### 4. 讀 composables

先讀 `useImageTracking.js`，再讀 `useARSession.js`。

### 5. 最後才讀 provider

只先看 `session.client.js` 的 `load()`、`start()`、`stop()`。其餘 XR8 細節有需求時再看。

程式中已使用以下標記：

```text
[素材設定｜最常改]
[POC 入口｜會改]
[POC 行為｜依需求改]
[共用核心｜通常不改]
[Three.js 共用｜通常不改]
[8th Wall 邊界｜換 provider 才改]
```

你可以在編輯器搜尋這些文字，快速找到該看或該改的地方。

---

## 第六課：常見客製需求要改哪裡

| 想做的事 | 修改位置 |
| --- | --- |
| 換辨識圖片 | 重新跑 Image Target CLI，替換 targets，更新 config |
| 換 GLB | 替換 `public/ar/image-scan/models/`，修改 `model.path` |
| 調整模型大小 | `model.maxSize` |
| 調整模型在圖片上的角度 | `model.targetTransform` |
| 調整失焦後的位置 | `model.cameraTransform` |
| 失焦後不要顯示 | `tracking.lostBehavior = 'hide'` |
| 點擊播放不同動畫 | `animation.onClick` |
| 點擊打開資訊卡 | page 的 `handleCharacterClick()` |
| 點擊呼叫 API | page 的 `handleCharacterClick()`，複雜時再抽 business composable |
| 改用 MindAR | 新增 `ar/providers/mindar/`，不要重寫 Three.js model controller |

最常修改的三個地方：

```text
1. experiences/image-scan/config.js
2. public/ar/image-scan/
3. pages/experiences/image-scan.vue 的 handleCharacterClick()
```

---

## 第七課：如何拿去另一個 Nuxt 專案

### 必須複製

```text
ar/
composables/useARSession.js
composables/useImageTracking.js
3d/
components/ar/Canvas.client.vue
experiences/image-scan/
pages/experiences/image-scan.vue
public/ar/image-scan/
public/legal/
```

### 必須合併設定

從 `nuxt.config.js` 帶走：

- `/experiences/**` 的 client-only route rule。
- `runtimeConfig.public.ar` 的 script URLs。

從 `package.json` 帶走：

```json
{
  "dependencies": {
    "three": "0.185.1"
  }
}
```

`@lucide/vue` 只負責頁面 icon，可以換掉。Pinia 不是這個 Image POC 的必要條件。

### 不要複製

```text
node_modules/
.nuxt/
.output/
.vercel/
.env
experiences/spatial-hunt/
stores/
services/ar/8thWallWorldAdapter.client.js
```

最後三項屬於空間尋寶，不是 Image AR 必要核心。

### 如果仍在這個 Lab 新增另一個 POC

1. 複製 `experiences/image-scan/` 並改資料夾名稱。
2. 複製 `pages/experiences/image-scan.vue` 並改檔名。
3. 建立新的 `public/ar/<slug>/` 素材。
4. 修改新 POC 的 config。
5. 在 `data/experiences.js` 新增首頁卡片。
6. 共用 `ar/`、`3d/`、`composables/`，不要每個 POC 再複製一份。

---

## 第八課：怎麼測試

### 本機先檢查 UI

```bash
npm run dev
```

開啟：

```text
http://127.0.0.1:3000/experiences/image-scan/
```

`localhost` 和 `127.0.0.1` 是瀏覽器給開發環境的安全例外。

### 手機測試

手機必須使用 HTTPS。部署後開啟：

```text
https://janshawn.github.io/webar-lab/experiences/image-scan/
```

然後掃描：

- 印出的明信片，或
- 另一台電腦／平板顯示的明信片。

同一支手機無法同時顯示 target，又用自己的後鏡頭掃描自己。

可在網址加上：

```text
?debug=1
```

查看 session、image tracking、display mode 與動畫數量。

### 修改後執行

```bash
npm test
npm run build
```

GitHub Pages 只有在程式 commit、push 且 GitHub Actions 成功後才會更新。本機有檔案，不代表線上網址已存在。

---

## 最後只要記住五件事

1. `config.js` 是素材與位置的第一修改點。
2. 相機和 XR8 集中在 `ar/providers/8thwall/`，不要散落到頁面。
3. 模型掛在 target anchor 才會跟著圖片；掛在 camera 才會固定在畫面前。
4. 點擊後的客製行為從 `handleCharacterClick()` 開始。
5. 離開頁面一定要 stop 相機並 dispose Three.js 資源。

如果這五件事理解了，你就已經能開始把 POC 改成下一個客製案。
