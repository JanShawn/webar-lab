# WebAR Lab

Nuxt 4 + Vue 3 + Three.js + 8th Wall 的 WebAR POC 專案。

如果你第一次看這個專案，只需要從一份文件開始：

## [開始閱讀：WebAR POC 入門與客製指南](docs/START-HERE.md)

它會一步一步說明：

- 專案目錄為什麼這樣分類。
- 每個重要檔案從哪裡來、解決什麼問題。
- 掃描圖片到顯示模型的完整程式流程。
- 新專案要複製哪些核心、哪些檔案不用拿。
- 換圖片、GLB、動畫與互動時要修改哪裡。

## 本機執行

```bash
npm install
npm run dev
```

- 桌面可查看首頁與 UI。
- 本機 `localhost` 可使用相機安全環境例外。
- 手機正式測試要使用 HTTPS。

## 驗證

```bash
npm test
npm run build
```

## 產生新的 Image Target

```bash
npm run target:create
```

CLI 每一題要填什麼，請看 [START-HERE：工具產生的 Image Target 檔案](docs/START-HERE.md#工具產生的-image-target-檔案)。

GitHub Pages 由 `.github/workflows/deploy-pages.yml` 發佈。Image POC 部署後的入口：

```text
https://janshawn.github.io/webar-lab/experiences/image-scan/
```

8th Wall 的開源框架與 SLAM binary 授權不同；若未來改成白牌或收費平台，需重新審查 XR Engine License。第三方來源與授權紀錄放在 `docs/THIRD-PARTY-NOTICES.md`。
