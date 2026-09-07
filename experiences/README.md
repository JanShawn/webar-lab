# Experiences

每個 POC 都放在自己的資料夾，避免不同 tracking 類型互相污染。

```text
experiences/
├─ spatial-hunt/   # POC 01：World Tracking，目前已完成
├─ image-scan/     # POC 02：Image Tracking，下一個要完成
├─ face-effect/    # 未來建立
└─ location-ar/    # 未來建立
```

每個完成的 POC 原則上包含：

```text
config.js          # 最先替換的素材與參數
createScene.js     # 3D scene、anchor、動畫、raycasting
store.js           # 只有複雜流程才需要
README.md          # 這個 POC 在學什麼、如何替換
```

Nuxt route 保留在 `pages/experiences/<slug>.vue`。共用相機／engine lifecycle 才放進 `services/ar/`。

新增 POC 時：

1. 在 `data/experiences.js` 增加首頁卡片。
2. 建立 `experiences/<slug>/`。
3. 建立 `pages/experiences/<slug>.vue`。
4. 完成後把 manifest 的 `status` 改成 `ready`。
