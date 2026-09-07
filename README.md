# WebAR Lab v0.1

Nuxt 4 + Three.js 的行動 WebAR 實驗底座。第一個體驗是室內空間尋寶：放置探測車後，尋找並點擊五顆能量晶體。

建議先閱讀 [WebAR 核心概念](docs/WEBAR-CORE-CONCEPTS.md)，理解相機、空間掃描、圖片偵測、anchor、render loop 與 teardown。接著再看 [WebAR POC Starter Guide](docs/POC-STARTER-GUIDE.md)，了解建立新 POC 時應複製與替換哪些檔案。

## 開發

```bash
npm install
npm run dev
```

桌面瀏覽器可檢查首頁與錯誤替代畫面；完整空間追蹤需以 HTTPS 網址在支援的手機瀏覽器開啟。加入 `?debug=1` 可顯示 phase、tracking、FPS、模型載入時間與錯誤狀態。

## 驗證

```bash
npm test
npm run build
```

單元測試涵蓋 phase transition、目標位置範圍與間距、收集去重、暫停計時及最佳時間儲存。

## 部署到 Vercel

1. 將 repository 匯入 Vercel，Framework Preset 選擇 Nuxt.js。
2. 設定 `NUXT_PUBLIC_SITE_URL` 為 production HTTPS URL。
3. 部署完成後首頁 QR code 會自動指向相同 origin 的體驗 route。

`vercel.json` 已加入相機 Permissions Policy。直接重新整理 `/experiences/spatial-hunt` 會由 Nuxt/Vercel 正常處理。

## 部署到 GitHub Pages

`.github/workflows/deploy-pages.yml` 會在 `main` 更新時產生靜態網站，並以 `/webar-lab/` 作為 base URL。請在 GitHub repository 的 Settings → Pages 將 Source 設為 **GitHub Actions**。

## 架構邊界

- `services/ar/8thWallWorldAdapter.client.js`：唯一直接接觸 `XR8` globals 的 adapter。
- `services/ar/createSpatialHuntPipeline.client.js`：Three.js scene、模型、raycasting 與動畫。
- `stores/spatialHunt.js`：UI 與遊戲 phase、計時、收集和最佳紀錄。
- `data/experiences.js`：未來新增 Image Target、Face Effect 的共用 manifest 入口。

### 建議閱讀順序

1. `stores/spatialHunt.js`：先看 phase 與計時，理解遊戲規則。
2. `experiences/spatial-hunt/config.js`：看所有優先客製的參數。
3. `pages/experiences/spatial-hunt.vue`：看 Vue 如何協調 UI、adapter、pipeline 和手勢。
4. `services/ar/8thWallWorldAdapter.client.js`：看相機／XR8 lifecycle 與 teardown。
5. `services/ar/createSpatialHuntPipeline.client.js`：看 Three.js 場景、raycasting 和動畫。
6. `utils/spawnLayout.js`：看晶體如何產生在固定物理範圍內。

8th Wall 的開源框架與 SLAM binary 授權不同。這個版本只作內部 Lab／作品 Demo；若改為白牌、自助式或收費平台，必須先重新審查 XR Engine License。素材與 binary notice 位於 `public/legal/`。
