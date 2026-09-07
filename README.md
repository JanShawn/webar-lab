# WebAR Lab v0.1

Nuxt 4 + Three.js 的行動 WebAR 實驗底座。第一個體驗是室內空間尋寶：放置探測車後，尋找並點擊五顆能量晶體。

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

## 架構邊界

- `services/ar/8thWallWorldAdapter.client.js`：唯一直接接觸 `XR8` globals 的 adapter。
- `services/ar/createSpatialHuntPipeline.client.js`：Three.js scene、模型、raycasting 與動畫。
- `stores/spatialHunt.js`：UI 與遊戲 phase、計時、收集和最佳紀錄。
- `data/experiences.js`：未來新增 Image Target、Face Effect 的共用 manifest 入口。

8th Wall 的開源框架與 SLAM binary 授權不同。這個版本只作內部 Lab／作品 Demo；若改為白牌、自助式或收費平台，必須先重新審查 XR Engine License。素材與 binary notice 位於 `public/legal/`。
