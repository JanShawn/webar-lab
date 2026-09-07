# POC 02：圖片掃描與模型互動

這個資料夾是下一個學習單元，目前先保留規格，不放假的 tracking 程式。

預計完成的最小流程：

```text
開相機 → scanning → target found → 顯示模型 → 點模型互動 → target lost
```

預計檔案：

```text
config.js                 # target、模型與尺寸
createScene.client.js     # image anchor、GLB、raycasting
MindArImageAdapter.client.js
README.md
```

開始實作前需要：

1. 一張要辨識的圖片。
2. 一個 `.glb` 模型；也可以先沿用 ToyCar。
3. 決定點擊模型後的第一個行為，例如旋轉、變色或顯示資訊卡。
