// --- 2. オブジェクト設計 (メタデータスキーマ) ---
const meta = {
    dashboard: { label: 'ダッシュボード', icon: '📊', color: '#0176D3', listFields: [] },
    agency: {
        label: '事務所', icon: '🏢', color: '#7E8BE4',
        fields: [
            { name: 'name', label: '事務所名', type: 'text' },
            { name: 'foundedYear', label: '設立年', type: 'number' },
            { name: 'location', label: '所在地', type: 'text' }
        ],
        listFields: ['id', 'name', 'foundedYear', 'location']
    },
    idol: {
        label: 'アイドル', icon: '🎤', color: '#34A853',
        fields: [
            { name: 'name', label: '名前', type: 'text' },
            { name: 'birthday', label: '生年月日', type: 'date' },
            { name: 'status', label: '活動ステータス', type: 'select', options: ['活動中', '活動休止', '卒業', '引退', '脱退', '退所', '活動終了'] },
            { name: 'agencyId', label: '所属事務所', type: 'lookup', target: 'agency' },
            { name: 'memberColor', label: 'メンバーカラー', type: 'text' },
            { name: 'notes', label: '備考', type: 'textarea' }
        ],
        listFields: ['id', 'name', 'status', 'agencyId', 'memberColor', 'notes']
    },
    group: {
        label: 'グループ', icon: '👥', color: '#F2994A',
        fields: [
            { name: 'name', label: 'グループ名', type: 'text' },
            { name: 'debutDate', label: 'デビュー日', type: 'date' },
            { name: 'status', label: '活動ステータス', type: 'select', options: ['活動中', '活動休止', '解散'] }
        ],
        listFields: ['id', 'name', 'debutDate', 'status']
    },
    work: {
        label: '作品', icon: '🎬', color: '#9B51E0',
        fields: [
            { name: 'title', label: 'タイトル / 番組名', type: 'text' },
            { name: 'type', label: '種別', type: 'select', options: ['シングル', 'アルバム', '映像作品', '映画', 'ドラマ', 'バラエティ', 'ラジオ', '音楽番組', '報道'] },
            { name: 'publisher', label: 'レーベル / 放送局', type: 'text' },
            { name: 'ownerRecord', label: '所有者(メイン)', type: 'polymorphic', targets: ['idol', 'group'] },
            { name: 'releaseDate', label: '発売日 / 開始日', type: 'date' }
        ],
        listFields: ['id', 'title', 'type', 'publisher', 'ownerRecord', 'releaseDate']
    },
    live: {
        label: 'ライブ', icon: '🎸', color: '#E25858',
        fields: [
            { name: 'name', label: 'ライブ名', type: 'text' },
            { name: 'date', label: '開催日', type: 'date' },
            { name: 'venueId', label: '会場', type: 'lookup', target: 'venue' }
        ],
        listFields: ['id', 'name', 'date', 'venueId']
    },
    venue: {
        label: '会場', icon: '🏟️', color: '#4A90E2',
        fields: [
            { name: 'name', label: '会場名', type: 'text' },
            { name: 'location', label: '所在地', type: 'text' },
            { name: 'capacity', label: '収容人数', type: 'number' }
        ],
        listFields: ['id', 'name', 'location', 'capacity']
    },
    event: {
        label: 'イベント', icon: '📅', color: '#F1C40F',
        fields: [
            { name: 'date', label: '日付', type: 'date' },
            { name: 'type', label: 'イベント種別', type: 'select', options: ['結成', 'デビュー', '改名', '活動休止', '卒業', '脱退', 'その他'] },
            { name: 'description', label: '説明', type: 'text' }
        ],
        listFields: ['id', 'date', 'type', 'description']
    },
    report: { label: 'レポート', icon: '📊', color: '#0176D3', listFields: [] },
    affiliation: {
        label: '所属管理', icon: '🔗', color: '#546E7A',
        fields: [
            { name: 'idolId', label: 'アイドル', type: 'lookup', target: 'idol' },
            { name: 'groupId', label: 'グループ', type: 'lookup', target: 'group' },
            { name: 'status', label: '所属ステータス', type: 'select', options: ['在籍中', '活動休止', '脱退'] },
            { name: 'role', label: '役職', type: 'text' },
            { name: 'isConcurrent', label: '兼務フラグ', type: 'select', options: ['true', 'false'] }
        ],
        listFields: ['id', 'idolId', 'groupId', 'status', 'isConcurrent']
    },
    groupHistory: {
        label: 'グループ名変更履歴', icon: '📜', color: '#8E6E53',
        fields: [
            { name: 'groupId', label: 'グループ', type: 'lookup', target: 'group' },
            { name: 'oldName', label: '旧名称', type: 'text' },
            { name: 'newName', label: '新名称', type: 'text' },
            { name: 'changeDate', label: '変更日', type: 'date' }
        ],
        listFields: ['id', 'groupId', 'oldName', 'newName', 'changeDate']
    },
    participation: {
        label: '作品参加', icon: '🎵', color: '#2E7D32',
        fields: [
            { name: 'workId', label: '作品', type: 'lookup', target: 'work' },
            { name: 'idolId', label: 'アイドル', type: 'lookup', target: 'idol' },
            { name: 'role', label: '役割', type: 'text' }
        ],
        listFields: ['id', 'workId', 'idolId', 'role']
    },
    liveCast: {
        label: 'ライブ出演', icon: '🎤', color: '#C2185B',
        fields: [
            { name: 'liveId', label: 'ライブ', type: 'lookup', target: 'live' },
            { name: 'groupId', label: 'グループ', type: 'lookup', target: 'group' }
        ],
        listFields: ['id', 'liveId', 'groupId']
    },
    settings: { label: '設定 (ER図)', icon: '⚙️', color: '#747474', listFields: [] }
};

// UI表示用のタブ定義
const TABS = ['dashboard', 'agency', 'idol', 'group', 'work', 'live', 'venue', 'event', 'report', 'settings'];

// タブバーの「＝」メニュー内に折りたたむ補助/中間オブジェクト
const OVERFLOW_TABS = ['affiliation', 'groupHistory', 'participation', 'liveCast'];

// --- 3. アプリケーション制御コア ---
