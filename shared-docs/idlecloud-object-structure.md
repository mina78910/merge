# idlecloud オブジェクト構成メモ

このファイルは、`idlecloud.html` 系の画面で利用している **オブジェクト定義・項目定義・リレーション** をテキストで確認するためのメモです。

- 画面本体: `idlecloud.html`
- CSS: `idlecloud-assets/idlecloud.css`
- 初期データ: `idlecloud-assets/idlecloud-data.js`
- オブジェクト定義: `idlecloud-assets/idlecloud-meta.js`
- 画面制御: `idlecloud-assets/idlecloud-app.js`

> この `shared-docs/` フォルダは、今後ほかの HTML でも共通利用する設計メモ・定義書置き場として使う想定です。

---

## 1. 全体構成

`idlecloud` は、アイドル・グループ・事務所・作品・ライブ・会場・イベントを中心にした、メモリ保持型の疑似 CRM です。

### 主要オブジェクト

| オブジェクトキー | 表示名 | 用途 | 画面タブ |
|---|---|---|---|
| `agency` | 事務所 | 所属事務所マスタ | 表示 |
| `idol` | アイドル | タレント個人マスタ | 表示 |
| `group` | グループ | グループ/ユニットマスタ | 表示 |
| `work` | 作品 | 楽曲・映画・ドラマ・番組などの作品マスタ | 表示 |
| `live` | ライブ | ライブ/公演マスタ | 表示 |
| `venue` | 会場 | ライブ会場マスタ | 表示 |
| `event` | イベント | 歴史イベント・時系列メモ | 表示 |
| `affiliation` | 所属管理 | アイドルとグループの N:N 中間オブジェクト | 「＝」メニュー/関連リスト |
| `groupHistory` | グループ名変更履歴 | グループの改名履歴 | 「＝」メニュー/関連リスト |
| `participation` | 作品参加 | アイドルと作品の N:N 中間オブジェクト | 「＝」メニュー/関連リスト |
| `liveCast` | ライブ出演 | グループとライブの中間オブジェクト | 「＝」メニュー/関連リスト |
| `dashboard` | ダッシュボード | KPI/集計表示 | 表示 |
| `report` | レポート | カスタムレポート検索 | 表示 |
| `settings` | 設定 (ER図) | ER図/設計確認 | 表示 |

---

## 2. オブジェクト別定義

### 2.1 `agency` - 事務所

所属事務所を管理する親マスタです。

| 項目名 | 表示名 | 型 | 備考 |
|---|---|---|---|
| `id` | ID | number | 主キー |
| `name` | 事務所名 | text | 例: `SMILE-UP.`, `STARTO ENTERTAINMENT` |
| `foundedYear` | 設立年 | number | 設立年 |
| `location` | 所在地 | text | 所在地 |

### 2.2 `idol` - アイドル

タレント個人を管理する中心オブジェクトです。

| 項目名 | 表示名 | 型 | 備考 |
|---|---|---|---|
| `id` | ID | number | 主キー |
| `name` | 名前 | text | タレント名 |
| `birthday` | 生年月日 | date | 生年月日 |
| `status` | 活動ステータス | select | `活動中`, `活動休止`, `卒業`, `引退`, `脱退`, `退所`, `活動終了` |
| `agencyId` | 所属事務所 | lookup | `agency.id` への参照 |
| `memberColor` | メンバーカラー | text | メンバーカラー |
| `notes` | 備考 | textarea | 退所後状況などのロングテキスト |

### 2.3 `group` - グループ

グループ/ユニットを管理するマスタです。

| 項目名 | 表示名 | 型 | 備考 |
|---|---|---|---|
| `id` | ID | number | 主キー |
| `name` | グループ名 | text | グループ名 |
| `debutDate` | デビュー日 | date | デビュー日 |
| `status` | 活動ステータス | select | `活動中`, `活動休止`, `解散` |

### 2.4 `work` - 作品

楽曲、アルバム、映像作品、映画、ドラマ、番組などを管理するマスタです。

| 項目名 | 表示名 | 型 | 備考 |
|---|---|---|---|
| `id` | ID | number | 主キー |
| `title` | タイトル / 番組名 | text | 作品名 |
| `type` | 種別 | select | `シングル`, `アルバム`, `映像作品`, `映画`, `ドラマ`, `バラエティ`, `ラジオ`, `音楽番組`, `報道` |
| `publisher` | レーベル / 放送局 | text | レーベル、放送局など |
| `ownerRecord` | 所有者(メイン) | polymorphic | `idol` または `group` を参照可能 |
| `releaseDate` | 発売日 / 開始日 | date | 発売日、放送開始日など |

### 2.5 `live` - ライブ

ライブ/公演を管理するマスタです。

| 項目名 | 表示名 | 型 | 備考 |
|---|---|---|---|
| `id` | ID | number | 主キー |
| `name` | ライブ名 | text | ライブ/公演名 |
| `date` | 開催日 | date | 開催日 |
| `venueId` | 会場 | lookup | `venue.id` への参照 |

### 2.6 `venue` - 会場

ライブ会場を管理するマスタです。

| 項目名 | 表示名 | 型 | 備考 |
|---|---|---|---|
| `id` | ID | number | 主キー |
| `name` | 会場名 | text | 会場名 |
| `location` | 所在地 | text | 都道府県/地域 |
| `capacity` | 収容人数 | number | 収容人数 |

### 2.7 `event` - イベント

グループや事務所、作品などに関する歴史イベントを時系列で管理します。

| 項目名 | 表示名 | 型 | 備考 |
|---|---|---|---|
| `id` | ID | number | 主キー |
| `date` | 日付 | date | イベント日 |
| `type` | イベント種別 | select | `結成`, `デビュー`, `改名`, `活動休止`, `卒業`, `脱退`, `その他` |
| `description` | 説明 | text | イベント内容 |

---

## 3. 中間/履歴オブジェクト

### 3.1 `affiliation` - 所属管理

アイドルとグループの所属関係を管理する N:N 中間オブジェクトです。

| 項目名 | 表示名 | 型 | 備考 |
|---|---|---|---|
| `id` | ID | number | 主キー |
| `idolId` | アイドル | lookup | `idol.id` への参照 |
| `groupId` | グループ | lookup | `group.id` への参照 |
| `status` | 所属ステータス | select | `在籍中`, `活動休止`, `脱退` |
| `role` | 役職 | text | リーダー、メンバー、センターなど |
| `isConcurrent` | 兼務フラグ | select | `true`, `false` |

### 3.2 `groupHistory` - グループ名変更履歴

グループの改名履歴を管理する履歴オブジェクトです。

| 項目名 | 型 | 備考 |
|---|---|---|
| `id` | number | 主キー |
| `groupId` | lookup | `group.id` への参照 |
| `oldName` | text | 変更前グループ名 |
| `newName` | text | 変更後グループ名 |
| `changeDate` | date | 変更日 |

### 3.3 `participation` - 作品参加

アイドルと作品の出演/参加関係を管理する N:N 中間オブジェクトです。

| 項目名 | 型 | 備考 |
|---|---|---|
| `id` | number | 主キー |
| `workId` | lookup | `work.id` への参照 |
| `idolId` | lookup | `idol.id` への参照 |
| `role` | text | 出演、主演、役名など |

### 3.4 `liveCast` - ライブ出演

グループとライブの出演関係を管理する中間オブジェクトです。

| 項目名 | 型 | 備考 |
|---|---|---|
| `id` | number | 主キー |
| `liveId` | lookup | `live.id` への参照 |
| `groupId` | lookup | `group.id` への参照 |

---

## 4. 主なリレーション

```text
agency 1 ── * idol
idol * ── * group  （中間: affiliation）
group 1 ── * groupHistory
idol * ── * work   （中間: participation）
group * ── * live  （中間: liveCast）
venue 1 ── * live
work.ownerRecord ──> idol または group（ポリモーフィック参照）
```

### リレーション詳細

| 関係 | 内容 |
|---|---|
| `agency.id` → `idol.agencyId` | 事務所に所属するアイドル一覧を表現 |
| `idol.id` → `affiliation.idolId` | アイドルの所属グループ履歴を表現 |
| `group.id` → `affiliation.groupId` | グループの在籍タレント一覧を表現 |
| `group.id` → `groupHistory.groupId` | グループ名変更履歴を表現 |
| `work.id` → `participation.workId` | 作品の参加キャストを表現 |
| `idol.id` → `participation.idolId` | アイドルの出演/参加作品を表現 |
| `venue.id` → `live.venueId` | ライブ会場を表現 |
| `live.id` → `liveCast.liveId` | ライブ出演グループを表現 |
| `group.id` → `liveCast.groupId` | グループの出演ライブ履歴を表現 |
| `work.ownerRecord` → `idol` / `group` | 作品のメイン所有者を個人またはグループのどちらにもできる |

---

## 5. 画面タブ構成

表示タブは `TABS` で管理しています。

```text
dashboard, agency, idol, group, work, live, venue, event, report, settings
```

`affiliation`, `groupHistory`, `participation`, `liveCast` は、通常のタブバーには常時表示せず、タブバー右側の「＝」メニューに折りたたんで表示します。各オブジェクトはリストビューと詳細ページを持ち、詳細画面の関連リストからも遷移できます。

---

## 6. 今後オブジェクトを増やす時のメモ

新しいオブジェクトを追加する場合は、基本的に以下を更新します。

1. `idlecloud-assets/idlecloud-data.js`
   - 初期データ配列を追加
   - `counters` に採番開始値を追加
2. `idlecloud-assets/idlecloud-meta.js`
   - `meta` にオブジェクト定義を追加
   - 画面タブに出す場合は `TABS` にキーを追加
3. `idlecloud-assets/idlecloud-app.js`
   - 必要に応じて関連リストやダッシュボード集計を追加
4. このドキュメント
   - 項目定義、リレーション、用途を追記
