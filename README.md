# EBP統計トレーニング GitHub Pages版 v1.0

## 目的
ChatGPT Sitesに依存せず、GitHub Pagesで継続運用できる統計演習サイトです。

## 中核仕様
- Day一覧
- 単答・複数回答
- 選択肢ランダム化
- IDベース正答判定
- 正誤判定・解説表示
- LocalStorageによる途中保存
- Day単位の進捗・スコア保存
- PDF / Excelリンク
- スマホ対応
- noindex

## 更新方法
1. `data/days/dayXX.json` を追加
2. `data/index.json` にDay情報を追加
3. 必要ならPDF / Excelを `downloads/` に置くか、外部URLをJSONに設定
4. commit / push

## PDF / Excel
ファイルがなくてもサイトは壊れません。
`pdf_url` または `excel_url` が空ならボタンは表示されません。

## Google Drive
現時点では問題データをGoogle Driveへ蓄積する前提にしていません。
問題データはGitHubのJSON、教材ファイルはGitHubまたはGoogle Driveのどちらでも運用できます。

## 保存仕様
学習履歴は同じ端末・ブラウザのLocalStorageに保存されます。
別端末同期・アカウント同期は行いません。

## v1.1 修正
- 選択肢をランダム化した場合でも、画面上の A/B/C... と正答表示が一致するように修正。
- 正答判定自体は従来どおり choice ID ベース。
- 解説欄の正答は固定の `a,b,c...` を使わず、その回の表示順から動的に生成。
