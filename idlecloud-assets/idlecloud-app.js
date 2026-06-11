// === 万が一エラーが起きた場合に画面に表示する安全装置 ===
window.onerror = function(message, source, lineno, colno, error) {
    console.error("Error occurred:", message);
};

const app = {
    currentTab: 'dashboard',
    currentDetailId: null,
    detailHistory: [],
    sortCol: 'id',
    sortAsc: true,

    init: function() {
        this.renderGlobalNav();
        document.getElementById('search-input').addEventListener('input', function() { app.renderTable(); });
        document.getElementById('filter-select').addEventListener('change', function() { app.renderTable(); });
        this.switchTab('dashboard'); 
    },

    renderGlobalNav: function() {
        const nav = document.getElementById('global-nav');
        let html = '';
        for (let i = 0; i < TABS.length; i++) {
            const tab = TABS[i];
            const isActive = (tab === this.currentTab) ? 'active' : '';
            html += `<li class="${isActive}" onclick="app.switchTab('${tab}')">${meta[tab].label}</li>`;
        }

        const overflowTabs = (typeof OVERFLOW_TABS !== 'undefined') ? OVERFLOW_TABS : [];
        if (overflowTabs.length > 0) {
            const isOverflowActive = overflowTabs.indexOf(this.currentTab) > -1 ? 'active' : '';
            html += `<li class="nav-menu ${isOverflowActive}" aria-label="その他オブジェクト"><span class="nav-menu-trigger">＝</span><div class="nav-menu-dropdown">`;
            for (let i = 0; i < overflowTabs.length; i++) {
                const tab = overflowTabs[i];
                const itemActive = (tab === this.currentTab) ? 'active' : '';
                html += `<button type="button" class="nav-menu-item ${itemActive}" onclick="app.switchTab('${tab}')">${meta[tab].icon || '📄'} ${meta[tab].label}</button>`;
            }
            html += `</div></li>`;
        }
        nav.innerHTML = html;
    },

    switchView: function(viewId) {
        const views = document.querySelectorAll('.view-section');
        for (let i = 0; i < views.length; i++) {
            views[i].classList.remove('active');
        }
        const target = document.getElementById(viewId);
        if (target) {
            target.classList.add('active');
        }
    },

    switchTab: function(tab) {
        this.resetDetailHistory();
        this.currentTab = tab;
        this.renderGlobalNav();
        
        if (tab === 'settings') {
            this.switchView('view-settings');
            this.renderSettingsPage();
        } else if (tab === 'dashboard') {
            this.switchView('view-dashboard');
            this.renderDashboard();
        } else if (tab === 'report') {
            this.switchView('view-report');
            this.onReportObjectChange();
            this.runReport();
        } else {
            this.switchView('view-list');
            this.showList();
        }
    },

    getLookupName: function(targetObj, id) {
        if (!id) return '-';
        const targetDb = db[targetObj];
        if (!targetDb) return '-';
        const record = targetDb.find(function(r) { return r.id == id; });
        return record ? this.getRecordDisplayName(targetObj, record) : '-';
    },

    getRecordDisplayName: function(objName, record) {
        if (!record) return '-';
        if (record.name) return record.name;
        if (record.title) return record.title;
        if (record.description) return record.description;
        if (objName === 'affiliation') return `${this.getLookupName('idol', record.idolId)} × ${this.getLookupName('group', record.groupId)}`;
        if (objName === 'groupHistory') return `${record.oldName || '-'} → ${record.newName || '-'}`;
        if (objName === 'participation') {
            const participantName = record.groupId ? this.getLookupName('group', record.groupId) : this.getLookupName('idol', record.idolId);
            return `${this.getLookupName('work', record.workId)} / ${participantName}`;
        }
        if (objName === 'liveCast') return `${this.getLookupName('live', record.liveId)} / ${this.getLookupName('group', record.groupId)}`;
        return `ID:${record.id}`;
    },

    getRecordLink: function(objName, record, label) {
        if (!record || !meta[objName]) return label || '-';
        const displayLabel = label || this.getRecordDisplayName(objName, record);
        return `<span class="action-link" onclick="app.changeTabAndShowDetail('${objName}', ${record.id})">${displayLabel}</span>`;
    },

    getLookupLink: function(targetObj, id) {
        const targetDb = db[targetObj];
        if (!id || !targetDb || !meta[targetObj]) return this.getLookupName(targetObj, id);
        const record = targetDb.find(function(r) { return r.id == id; });
        if (!record) return '-';
        return this.getRecordLink(targetObj, record);
    },

    getPolymorphicDisplay: function(val) {
        if (!val) return '-';
        const parts = val.split('_');
        if (parts.length !== 2) return val;
        const targetObj = parts[0];
        const targetId = parseInt(parts[1], 10);
        const targetDb = db[targetObj];
        if (!targetDb) return val;
        const record = targetDb.find(function(r) { return r.id === targetId; });
        if (!record) return val;
        const name = record.name || record.title;
        return this.getRecordLink(targetObj, record, `[${meta[targetObj].label}] ${name}`);
    },

    getPolymorphicNameOnly: function(val) {
        if (!val) return '-';
        const parts = val.split('_');
        if (parts.length !== 2) return val;
        const targetObj = parts[0];
        const targetId = parseInt(parts[1], 10);
        const targetDb = db[targetObj];
        if (!targetDb) return val;
        const record = targetDb.find(function(r) { return r.id === targetId; });
        if (!record) return val;
        return `[${meta[targetObj].label}] ${record.name || record.title}`;
    },

    getBadgeHtml: function(status) {
        if (!status) return '-';
        let cls = 'badge-pause';
        if (status === '活動中' || status === '在籍中') cls = 'badge-active';
        if (status === '卒業' || status === '引退' || status === '脱退' || status === '退所' || status === '活動終了' || status === '解散') cls = 'badge-grad';
        return `<span class="badge ${cls}">${status}</span>`;
    },

    // ==========================================
    // リストビュー
    // ==========================================
    showList: function() {
        this.resetDetailHistory();
        const m = meta[this.currentTab];
        if (!m || !m.listFields || m.listFields.length === 0) return;

        document.getElementById('list-title').innerHTML = `${m.icon} ${m.label} 一覧`;
        
        const filter = document.getElementById('filter-select');
        filter.innerHTML = '<option value="all">すべて表示</option>';
        if(this.currentTab === 'idol' || this.currentTab === 'group') {
            filter.innerHTML += '<option value="活動中">活動中のみ</option><option value="活動休止">活動休止のみ</option><option value="脱退">脱退/退所/活動終了/解散</option>';
        }
        this.renderTable();
    },

    renderTable: function() {
        const m = meta[this.currentTab];
        if (!m || !m.listFields) return;

        const thead = document.getElementById('list-thead');
        const tbody = document.getElementById('list-tbody');
        const search = document.getElementById('search-input').value.toLowerCase();
        const filterVal = document.getElementById('filter-select').value;

        let theadHtml = '';
        for (let i = 0; i < m.listFields.length; i++) {
            const f = m.listFields[i];
            const fieldMeta = m.fields.find(function(x) { return x.name === f; }) || {label: 'ID'};
            const arrow = this.sortCol === f ? (this.sortAsc ? '▲' : '▼') : '';
            theadHtml += `<th onclick="app.sortData('${f}')">${fieldMeta.label} <span style="font-size:10px">${arrow}</span></th>`;
        }
        theadHtml += '<th style="width:100px;">アクション</th>';
        thead.innerHTML = theadHtml;

        let data = [];
        if (db[this.currentTab]) {
            data = db[this.currentTab].slice(); 
        }

        if (filterVal !== 'all' && (this.currentTab === 'idol' || this.currentTab === 'group')) {
            if (filterVal === '脱退') {
                data = data.filter(function(r) { return r.status === '脱退' || r.status === '退所' || r.status === '活動終了' || r.status === '解散'; });
            } else {
                data = data.filter(function(r) { return r.status === filterVal; });
            }
        }

        if (search) {
            data = data.filter(function(r) {
                return Object.values(r).some(function(val) {
                    return String(val).toLowerCase().includes(search);
                });
            });
        }

        data.sort(function(a, b) {
            let valA = a[app.sortCol]; let valB = b[app.sortCol];
            if (valA < valB) return app.sortAsc ? -1 : 1;
            if (valA > valB) return app.sortAsc ? 1 : -1;
            return 0;
        });

        let tbodyHtml = '';
        if (data.length === 0) {
            tbodyHtml = `<tr><td colspan="${m.listFields.length + 1}" style="text-align:center; padding:20px;">レコードが存在しません</td></tr>`;
        } else {
            for (let i = 0; i < data.length; i++) {
                const record = data[i];
                tbodyHtml += '<tr>';
                for (let j = 0; j < m.listFields.length; j++) {
                    const f = m.listFields[j];
                    const fieldMeta = m.fields.find(function(x) { return x.name === f; });
                    let val = record[f];
                    
                    if (fieldMeta && fieldMeta.type === 'lookup') {
                        val = this.getLookupLink(fieldMeta.target, val);
                    } else if (fieldMeta && fieldMeta.type === 'polymorphic') {
                        val = this.getPolymorphicDisplay(val);
                    } else if (f === 'status') {
                        val = this.getBadgeHtml(val);
                    } else if (f === 'isConcurrent') {
                        val = val === 'true' ? '✅ 兼務' : '-';
                    }

                    let displayVal = (val !== undefined && val !== null && val !== '') ? val : '-';

                    if (f === 'name' || f === 'title' || f === 'description') {
                        tbodyHtml += `<td><span class="action-link" onclick="app.changeTabAndShowDetail('${this.currentTab}', ${record.id})" style="font-weight:bold;">${displayVal}</span></td>`;
                    } else {
                        tbodyHtml += `<td>${displayVal}</td>`;
                    }
                }
                tbodyHtml += `<td><span class="action-link" style="font-size:12px; margin-right:8px;" onclick="app.openModal('edit', ${record.id})">編集</span></td></tr>`;
            }
        }
        tbody.innerHTML = tbodyHtml;
    },

    sortData: function(col) {
        if(this.sortCol === col) this.sortAsc = !this.sortAsc;
        else { this.sortCol = col; this.sortAsc = true; }
        this.renderTable();
    },

    // ==========================================
    // レコード詳細画面 & 関連リスト
    // ==========================================
    showDetail: function(id) {
        this.currentDetailId = id;
        this.switchView('view-detail');

        const m = meta[this.currentTab];
        const record = db[this.currentTab].find(function(r) { return r.id === id; });
        
        document.getElementById('breadcrumb-text').innerText = `${m.label}一覧`;
        const iconEl = document.getElementById('detail-icon');
        iconEl.innerText = m.icon;
        iconEl.style.background = m.color;
        
        document.getElementById('detail-obj-name').innerText = m.label;
        document.getElementById('detail-title').innerText = record.name || record.title || record.description || `ID: ${record.id}`;

        let hpFieldsHtml = '';
        let count = 0;
        for (let i = 0; i < m.fields.length; i++) {
            if (count >= 4) break;
            const f = m.fields[i];
            let val = record[f.name];
            if(f.type === 'lookup') val = this.getLookupName(f.target, val);
            if(f.type === 'polymorphic') val = this.getPolymorphicNameOnly(val);
            if(f.name === 'status') val = this.getBadgeHtml(val);
            
            let displayVal = (val !== undefined && val !== null && val !== '') ? val : '-';
            hpFieldsHtml += `<div class="hp-field"><div class="hp-field-label">${f.label}</div><div class="hp-field-value">${displayVal}</div></div>`;
            count++;
        }
        document.getElementById('detail-hp-fields').innerHTML = hpFieldsHtml;

        let infoHtml = '';
        for (let i = 0; i < m.fields.length; i++) {
            const f = m.fields[i];
            let val = record[f.name];
            if (f.type === 'lookup') {
                val = this.getLookupLink(f.target, record[f.name]);
            } else if (f.type === 'polymorphic') {
                val = this.getPolymorphicDisplay(record[f.name]);
            } else if(f.name === 'status') {
                val = this.getBadgeHtml(val);
            }
            let displayVal = (val !== undefined && val !== null && val !== '') ? val : '-';
            infoHtml += `<div class="field-item"><div class="field-label">${f.label}</div><div class="field-value">${displayVal}</div></div>`;
        }
        document.getElementById('detail-info').innerHTML = infoHtml;

        this.renderRelatedLists(id);
        const detailMain = document.querySelector('#view-detail .detail-main-split');
        const relatedContainer = document.getElementById('related-lists-container');
        const hasRelatedLists = relatedContainer && relatedContainer.children.length > 0;
        if (detailMain) {
            detailMain.classList.toggle('no-related', !hasRelatedLists);
        }
        if (relatedContainer) {
            relatedContainer.style.display = hasRelatedLists ? '' : 'none';
        }
        this.updateRecordBackButton();
    },

    updateRecordBackButton: function() {
        const backButton = document.getElementById('detail-back-button');
        if (!backButton) return;
        backButton.style.display = this.detailHistory.length > 0 ? 'inline-flex' : 'none';
    },

    resetDetailHistory: function() {
        this.detailHistory = [];
        this.updateRecordBackButton();
    },

    goBackRecord: function() {
        const previous = this.detailHistory.pop();
        if (!previous) return;
        this.jumpToDetail(previous.tab, previous.id);
    },

    jumpToDetail: function(targetObj, id) {
        if(!id) return;
        if (!db[targetObj] || !meta[targetObj]) return;
        if(TABS.indexOf(targetObj) > -1) {
            this.currentTab = targetObj;
            this.renderGlobalNav();
        } else {
            this.currentTab = targetObj;
        }
        this.showDetail(id);
    },

    changeTabAndShowDetail: function(targetObj, id) {
        const detailView = document.getElementById('view-detail');
        const isDetailToDetail = detailView && detailView.classList.contains('active') && this.currentDetailId !== null;
        const isSameRecord = isDetailToDetail && this.currentTab === targetObj && this.currentDetailId === id;
        if (isDetailToDetail && !isSameRecord) {
            this.detailHistory.push({ tab: this.currentTab, id: this.currentDetailId });
        }
        this.jumpToDetail(targetObj, id);
    },

    renderRelatedLists: function(id) {
        const container = document.getElementById('related-lists-container');
        container.innerHTML = '';

        if(this.currentTab === 'agency') {
            this.buildRelatedList(container, 'idol', '所属アイドル一覧', function(r) { return r.agencyId === id; }, ['name', 'status', 'memberColor']);
        }
        else if(this.currentTab === 'idol') {
            this.buildRelatedList(container, 'affiliation', '所属グループ履歴', function(r) { return r.idolId === id; }, ['groupId', 'status', 'role', 'isConcurrent']);
            this.buildRelatedList(container, 'participation', '作品/番組 出演・参加実績', function(r) { return r.idolId === id; }, ['workId', 'role']);
        }
        else if(this.currentTab === 'group') {
            this.buildRelatedList(container, 'affiliation', '在籍タレント・所属メンバー', function(r) { return r.groupId === id; }, ['idolId', 'status', 'role']);
            this.buildRelatedList(container, 'participation', 'グループ名義の作品/番組参加実績', function(r) { return r.groupId === id; }, ['workId', 'role']);
            this.buildRelatedList(container, 'groupHistory', '改名履歴・名称変遷', function(r) { return r.groupId === id; }, ['oldName', 'newName', 'changeDate']);
            this.buildRelatedList(container, 'liveCast', '出演ライブ履歴', function(r) { return r.groupId === id; }, ['liveId']);
        }
        else if(this.currentTab === 'work') {
            this.buildRelatedList(container, 'participation', '作品/番組 参加キャスト', function(r) { return r.workId === id; }, ['idolId', 'groupId', 'role']);
            
        }
        else if(this.currentTab === 'venue') {
            this.buildRelatedList(container, 'live', '会場開催ライブ一覧', function(r) { return r.venueId === id; }, ['name', 'date']);
        }
        else if(this.currentTab === 'affiliation') {
            const rec = db.affiliation.find(function(r) { return r.id === id; });
            if (rec) {
                this.buildRelatedList(container, 'idol', '関連アイドル', function(r) { return r.id === rec.idolId; }, ['name', 'status', 'agencyId']);
                this.buildRelatedList(container, 'group', '関連グループ', function(r) { return r.id === rec.groupId; }, ['name', 'debutDate', 'status']);
            }
        }
        else if(this.currentTab === 'groupHistory') {
            const rec = db.groupHistory.find(function(r) { return r.id === id; });
            if (rec) this.buildRelatedList(container, 'group', '関連グループ', function(r) { return r.id === rec.groupId; }, ['name', 'debutDate', 'status']);
        }
        else if(this.currentTab === 'liveCast') {
            const rec = db.liveCast.find(function(r) { return r.id === id; });
            if (rec) {
                this.buildRelatedList(container, 'live', '関連ライブ', function(r) { return r.id === rec.liveId; }, ['name', 'date', 'venueId']);
                this.buildRelatedList(container, 'group', '関連グループ', function(r) { return r.id === rec.groupId; }, ['name', 'debutDate', 'status']);
            }
        }
    },

    buildRelatedList: function(container, objName, title, filterFunc, displayCols) {
        const relMeta = meta[objName] || { icon: '📄', fields: [] };
        let targetSrc = db[objName];
        if(!targetSrc) return;

        const data = targetSrc.filter(filterFunc);
        
        let html = `<div class="card related-list-card">
                        <div class="rl-header">
                            <h3><span style="margin-right:6px">${relMeta.icon || '🔗'}</span>${title} (${data.length})</h3>
                        </div>
                        <table class="rl-table"><thead><tr>`;
        
        for (let i = 0; i < displayCols.length; i++) {
            const col = displayCols[i];
            const f = relMeta.fields ? relMeta.fields.find(function(x) { return x.name === col; }) : null;
            const label = f ? f.label : (col === 'groupId' ? 'グループ' : col === 'idolId' ? 'アイドル' : col === 'workId' ? '作品(番組)' : col === 'liveId' ? 'ライブ' : col);
            html += `<th>${label}</th>`;
        }
        html += `<th>詳細</th></tr></thead><tbody>`;

        if(data.length === 0) {
            html += `<tr><td colspan="${displayCols.length + 1}" style="text-align:center; color:#888;">関連レコードはありません</td></tr>`;
        } else {
            for (let i = 0; i < data.length; i++) {
                const record = data[i];
                html += `<tr>`;
                for (let j = 0; j < displayCols.length; j++) {
                    const col = displayCols[j];
                    let val = record[col];
                    
                    if (col === 'groupId') {
                        val = this.getLookupLink('group', val);
                    } else if(col === 'idolId') {
                        val = this.getLookupLink('idol', val);
                    } else if(col === 'workId') {
                        val = this.getLookupLink('work', val);
                    } else if(col === 'liveId') {
                        val = this.getLookupLink('live', val);
                    } else if(col === 'status') {
                        val = this.getBadgeHtml(val);
                    } else if(col === 'isConcurrent') {
                        val = val === 'true' ? '✅ 兼務' : '単独所属';
                    }

                    let displayVal = (val !== undefined && val !== null && val !== '') ? val : '-';
                    if ((col === 'name' || col === 'title' || col === 'description' || col === 'oldName' || col === 'newName') && meta[objName]) {
                        displayVal = this.getRecordLink(objName, record, displayVal);
                    }
                    html += `<td>${displayVal}</td>`;
                }
                html += `<td>${this.getRecordLink(objName, record, '詳細へ')}</td></tr>`;
            }
        }
        html += `</tbody></table></div>`;
        container.innerHTML += html;
    },

    // ==========================================
    // ★新設: レポート機能ロジック
    // ==========================================
    onReportObjectChange: function() {
        const obj = document.getElementById('report-object-select').value;
        const m = meta[obj];
        if (!m || !m.fields) return;

        const fieldSelect = document.getElementById('report-field-select');
        let html = '<option value="id">レコードID</option>';
        for (let i = 0; i < m.fields.length; i++) {
            html += `<option value="${m.fields[i].name}">${m.fields[i].label}</option>`;
        }
        fieldSelect.innerHTML = html;
    },

    runReport: function() {
        const obj = document.getElementById('report-object-select').value;
        const field = document.getElementById('report-field-select').value;
        const op = document.getElementById('report-operator-select').value;
        const val = document.getElementById('report-value-input').value.toLowerCase();

        const m = meta[obj];
        if (!m || !m.listFields) return;

        document.getElementById('report-result-title').innerText = `${m.label} オブジェクトのカスタムレポート`;

        // ヘッダー生成
        const thead = document.getElementById('report-result-thead');
        let theadHtml = '';
        for (let i = 0; i < m.listFields.length; i++) {
            const f = m.listFields[i];
            const fieldMeta = m.fields.find(function(x) { return x.name === f; }) || {label: 'ID'};
            theadHtml += `<th>${fieldMeta.label}</th>`;
        }
        thead.innerHTML = theadHtml;

        // フィルタリング
        let data = [];
        if (db[obj]) {
            data = db[obj].slice();
        }

        if (val) {
            data = data.filter(function(record) {
                let targetVal = record[field];
                if (field === 'agencyId' || field === 'venueId') {
                    targetVal = app.getLookupName(field === 'agencyId' ? 'agency' : 'venue', targetVal);
                }
                targetVal = String(targetVal).toLowerCase();

                if (op === 'contains') {
                    return targetVal.indexOf(val) !== -1;
                } else if (op === 'equals') {
                    return targetVal === val;
                }
                return true;
            });
        }

        document.getElementById('report-result-count').innerText = `${data.length} レコード`;

        // テーブル結果生成
        const tbody = document.getElementById('report-result-tbody');
        let tbodyHtml = '';
        if (data.length === 0) {
            tbodyHtml = `<tr><td colspan="${m.listFields.length}" style="text-align:center; padding:20px; color:gray;">条件に一致する結果は見つかりませんでした</td></tr>`;
        } else {
            for (let i = 0; i < data.length; i++) {
                const record = data[i];
                tbodyHtml += '<tr>';
                for (let j = 0; j < m.listFields.length; j++) {
                    const f = m.listFields[j];
                    const fieldMeta = m.fields.find(function(x) { return x.name === f; });
                    let cellVal = record[f];

                    if (fieldMeta && fieldMeta.type === 'lookup') {
                        cellVal = this.getLookupLink(fieldMeta.target, cellVal);
                    } else if (fieldMeta && fieldMeta.type === 'polymorphic') {
                        cellVal = this.getPolymorphicDisplay(cellVal);
                    } else if (f === 'status') {
                        cellVal = this.getBadgeHtml(cellVal);
                    } else if (f === 'isConcurrent') {
                        cellVal = cellVal === 'true' ? '✅ 兼務' : '-';
                    }

                    let displayVal = (cellVal !== undefined && cellVal !== null && cellVal !== '') ? cellVal : '-';
                    
                    if (f === 'name' || f === 'title' || f === 'description') {
                        tbodyHtml += `<td><span class="action-link" onclick="app.changeTabAndShowDetail('${obj}', ${record.id})" style="font-weight:bold;">${displayVal}</span></td>`;
                    } else {
                        tbodyHtml += `<td>${displayVal}</td>`;
                    }
                }
                tbodyHtml += '</tr>';
            }
        }
        tbody.innerHTML = tbodyHtml;
    },

    // ==========================================
    // ダッシュボード 集計解析
    // ==========================================
    renderDashboard: function() {
        const totalIdols = db.idol ? db.idol.length : 0;
        const activeIdols = db.idol ? db.idol.filter(function(i) { return i.status === '活動中'; }).length : 0;
        const totalGroups = db.group ? db.group.length : 0;
        const totalWorks = db.work ? db.work.length : 0;

        document.getElementById('dash-kpi').innerHTML = `
            <div class="card kpi-card"><div class="kpi-value">${totalIdols}</div><div class="kpi-label">総タレント数</div></div>
            <div class="card kpi-card"><div class="kpi-value">${activeIdols}</div><div class="kpi-label">活動中タレント数</div></div>
            <div class="card kpi-card"><div class="kpi-value">${totalGroups}</div><div class="kpi-label">総グループ数</div></div>
            <div class="card kpi-card"><div class="kpi-value">${totalWorks}</div><div class="kpi-label">作品総数</div></div>
        `;

        const groupMembersCount = {};
        if (db.group) {
            for (let i = 0; i < db.group.length; i++) {
                groupMembersCount[db.group[i].id] = 0;
            }
        }
        if (db.affiliation) {
            for (let i = 0; i < db.affiliation.length; i++) {
                const a = db.affiliation[i];
                if (a.status === '在籍中' || a.status === '活動中' || a.status === '活動休止') {
                    if (groupMembersCount[a.groupId] !== undefined) {
                        groupMembersCount[a.groupId]++;
                    }
                }
            }
        }
        
        let chart1Html = '';
        let maxCount = 1;
        for (const key in groupMembersCount) {
            if (groupMembersCount[key] > maxCount) maxCount = groupMembersCount[key];
        }
        
        const sortedGroupCounts = [];
        for (const key in groupMembersCount) {
            sortedGroupCounts.push({ id: key, count: groupMembersCount[key] });
        }
        sortedGroupCounts.sort(function(a, b) { return b.count - a.count; });

        for (let i = 0; i < sortedGroupCounts.length; i++) {
            const gId = sortedGroupCounts[i].id;
            const count = sortedGroupCounts[i].count;
            const gName = this.getLookupName('group', gId);
            const width = (count / maxCount) * 100;
            chart1Html += `
                <div class="bar-row">
                    <div class="bar-label">${gName}</div>
                    <div class="bar-track"><div class="bar-fill" style="width:${width}%">${count}人</div></div>
                </div>`;
        }
        document.getElementById('chart-group-members').innerHTML = chart1Html;

        const concurrentMap = {};
        if (db.affiliation) {
            for (let i = 0; i < db.affiliation.length; i++) {
                const a = db.affiliation[i];
                if (a.isConcurrent === 'true') {
                    if (!concurrentMap[a.idolId]) concurrentMap[a.idolId] = [];
                    concurrentMap[a.idolId].push(this.getLookupName('group', a.groupId));
                }
            }
        }

        let chart2Html = '<ul style="padding-left:10px; font-size:13px; list-style:none;">';
        let concurrentCount = 0;
        for (let iId in concurrentMap) {
            concurrentCount++;
            chart2Html += `<li style="margin-bottom:10px; padding-bottom:6px; border-bottom:1px dashed var(--border-color)">
                <strong class="action-link" onclick="app.changeTabAndShowDetail('idol', ${iId})">🎤 ${this.getLookupName('idol', iId)}</strong><br>
                <span style="color:var(--brand-color); font-weight:bold; font-size:11px;">⚠️ 複数兼務所属: ${concurrentMap[iId].join(' ↔ ')}</span>
            </li>`;
        }
        chart2Html += '</ul>';
        document.getElementById('chart-concurrent').innerHTML = concurrentCount > 0 ? chart2Html : '<p style="color:gray; padding:10px;">現在兼務中のタレントはいません</p>';

        let timelineHtml = '';
        if (db.event) {
            const sortedEvents = db.event.slice().sort(function(a, b) {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateB - dateA;
            });
            
            for (let i = 0; i < sortedEvents.length; i++) {
                const e = sortedEvents[i];
                timelineHtml += `
                    <div class="timeline-item">
                        <div class="timeline-date">${e.date} [${e.type}]</div>
                        <div class="timeline-desc">${e.description}</div>
                    </div>`;
            }
        }
        document.getElementById('chart-timeline').innerHTML = timelineHtml;
    },

    // ==========================================
    // モーダル機能 (CRUD実装)
    // ==========================================
    editMode: 'new',
    editId: null,

    openModal: function(mode, id) {
        this.editMode = mode;
        this.editId = id;
        const m = meta[this.currentTab];
        if(!m || !m.fields) return;

        document.getElementById('modal-title').innerText = mode === 'new' ? `${m.label} レコード新規作成` : `${m.label} レコード編集`;
        
        let record = {};
        if (mode === 'edit' && db[this.currentTab]) {
            const found = db[this.currentTab].find(function(r) { return r.id === id; });
            if (found) record = found;
        }

        let formHtml = '';
        for (let i = 0; i < m.fields.length; i++) {
            const f = m.fields[i];
            let val = record[f.name] !== undefined ? record[f.name] : '';
            let isFullWidth = (f.type === 'text' || f.type === 'lookup' || f.type === 'polymorphic' || f.type === 'textarea') ? 'full-width' : '';
            
            formHtml += `<div class="form-group ${isFullWidth}"><label>${f.label}</label>`;
            if (this.currentTab === 'participation' && f.name === 'idolId') {
                formHtml += `<div style="font-size:11px; color:#747474; margin-bottom:4px;">入力規則: アイドルまたはグループのどちらか一方だけを選択してください。</div>`;
            }
            
            if (f.type === 'select') {
                formHtml += `<select id="form-${f.name}" class="input-field">`;
                for (let j = 0; j < f.options.length; j++) {
                    const opt = f.options[j];
                    const selected = (val === opt) ? 'selected' : '';
                    formHtml += `<option value="${opt}" ${selected}>${opt}</option>`;
                }
                formHtml += `</select>`;
            } 
            else if (f.type === 'lookup') {
                const targets = db[f.target] || [];
                formHtml += `<select id="form-${f.name}" class="input-field">
                    <option value="">--なし--</option>`;
                for (let j = 0; j < targets.length; j++) {
                    const t = targets[j];
                    const selected = (val == t.id) ? 'selected' : '';
                    formHtml += `<option value="${t.id}" ${selected}>${t.name || t.title}</option>`;
                }
                formHtml += `</select>`;
            }
            else if (f.type === 'polymorphic') {
                formHtml += `<select id="form-${f.name}" class="input-field">
                    <option value="">--なし--</option>`;
                for (let j = 0; j < f.targets.length; j++) {
                    const tObj = f.targets[j];
                    const targets = db[tObj] || [];
                    const labelPrefix = meta[tObj].label;
                    for (let k = 0; k < targets.length; k++) {
                        const t = targets[k];
                        const optVal = `${tObj}_${t.id}`;
                        const selected = (val === optVal) ? 'selected' : '';
                        formHtml += `<option value="${optVal}" ${selected}>[${labelPrefix}] ${t.name || t.title}</option>`;
                    }
                }
                formHtml += `</select>`;
            }
            else if (f.type === 'textarea') {
                formHtml += `<textarea class="input-field" id="form-${f.name}" rows="4">${val}</textarea>`;
            }
            else {
                formHtml += `<input type="${f.type}" class="input-field" id="form-${f.name}" value="${val}">`;
            }
            formHtml += `</div>`;
        }

        document.getElementById('modal-form-content').innerHTML = formHtml;
        document.getElementById('form-modal').style.display = 'flex';
    },

    closeModal: function() {
        document.getElementById('form-modal').style.display = 'none';
    },

    saveRecord: function() {
        const m = meta[this.currentTab];
        const formValues = {};

        for (let i = 0; i < m.fields.length; i++) {
            const f = m.fields[i];
            let val = document.getElementById(`form-${f.name}`).value;
            if (f.type === 'number' || f.type === 'lookup') {
                val = val ? parseInt(val, 10) : '';
            }
            formValues[f.name] = val;
        }

        if (!this.validateRecord(formValues)) {
            return;
        }

        let record = {};
        if (this.editMode === 'edit') {
            record = db[this.currentTab].find(function(r) { return r.id === app.editId; });
            Object.assign(record, formValues);
        } else {
            record = Object.assign({ id: counters[this.currentTab]++ }, formValues);
            if (!db[this.currentTab]) db[this.currentTab] = [];
            db[this.currentTab].push(record);
        }

        this.closeModal();
        if (document.getElementById('view-list').classList.contains('active')) {
            this.renderTable();
        } else {
            this.showDetail(record.id);
        }
    },

    validateRecord: function(record) {
        if (this.currentTab === 'participation') {
            const hasIdol = !!record.idolId;
            const hasGroup = !!record.groupId;
            if (hasIdol === hasGroup) {
                alert('作品参加の入力規則: 「アイドル」または「グループ」のどちらか一方だけを選択してください。');
                return false;
            }
        }
        return true;
    },

    deleteRecord: function(id) {
        if(!confirm('このレコードを本当に物理削除しますか？\n（関連リストの整合性が失われる可能性があります）')) return;
        db[this.currentTab] = db[this.currentTab].filter(function(r) { return r.id !== id; });
        this.showList();
    },

    // ==========================================
    // 設定画面 (Setup ER図)
    // ==========================================
    renderSettingsPage: function() {
        const container = document.getElementById('view-settings');
        if (!container) return;

        const html = `
            <div class="settings-page">
            <h1>☁️ アイドルcloud オブジェクト ERモデル設計図</h1>
            <div class="explanation">
                <strong>💡 学習ポイント：中間オブジェクトとカスタムレポート機能</strong><br>
                ・<b>カスタムレポート機能：</b> 新設されたレポートタブでは、オブジェクト単位のデータ抽出（SOQLクエリの擬似再現）を体験可能です。「特定のカラーのアイドル」「特定の放送局のドラマ作品」などを条件指定し、動的にデータを集計表示できます。<br>
                ・作品とアイドル/グループの関係は、作品参加オブジェクトでN:Nの参加実績として管理します。作品参加では「アイドル」または「グループ」のどちらか一方だけを選択する入力規則を想定しています。
            </div>

            <div class="er-grid">
                <div class="entity-box">
                    <div class="entity-header">🏢 事務所オブジェクト (親)</div>
                    <div class="f-row pk"><span>id</span><span class="f-type">PK (Number)</span></div>
                    <div class="f-row"><span>name</span><span class="f-type">Text</span></div>
                </div>

                <div class="entity-box">
                    <div class="entity-header">🎤 アイドルマスタ (子/親)</div>
                    <div class="f-row pk"><span>id</span><span class="f-type">PK (Number)</span></div>
                    <div class="f-row fk"><span>agencyId</span><span class="f-type">FK ➔ 事務所</span></div>
                    <div class="f-row"><span>name</span><span class="f-type">Text</span></div>
                    <div class="f-row"><span>notes</span><span class="f-type">Long Text</span></div>
                </div>

                <div class="entity-box">
                    <div class="entity-header int">🔗 所属管理 (N:N 中間)</div>
                    <div class="f-row pk"><span>id</span><span class="f-type">PK (Number)</span></div>
                    <div class="f-row fk"><span>idolId</span><span class="f-type">FK ➔ アイドル</span></div>
                    <div class="f-row fk"><span>groupId</span><span class="f-type">FK ➔ グループ</span></div>
                    <div class="f-row"><span>isConcurrent</span><span class="f-type">Checkbox</span></div>
                </div>

                <div class="entity-box">
                    <div class="entity-header">👥 グループマスタ (子/親)</div>
                    <div class="f-row pk"><span>id</span><span class="f-type">PK (Number)</span></div>
                    <div class="f-row"><span>name</span><span class="f-type">Text</span></div>
                </div>
            </div>

            <div class="er-grid">
                <div class="entity-box">
                    <div class="entity-header">🎬 作品マスタ</div>
                    <div class="f-row pk"><span>id</span><span class="f-type">PK (Number)</span></div>
                    <div class="f-row"><span>title</span><span class="f-type">Text</span></div>
                    <div class="f-row"><span>type</span><span class="f-type">Picklist</span></div>
                </div>

                <div class="entity-box">
                    <div class="entity-header int">🎵 作品参加 (N:N 中間)</div>
                    <div class="f-row pk"><span>id</span><span class="f-type">PK (Number)</span></div>
                    <div class="f-row fk"><span>workId</span><span class="f-type">FK ➔ 作品</span></div>
                    <div class="f-row fk"><span>idolId</span><span class="f-type">FK ➔ アイドル (排他)</span></div>
                    <div class="f-row fk"><span>groupId</span><span class="f-type">FK ➔ グループ (排他)</span></div>
                    <div class="f-row"><span>role</span><span class="f-type">Text</span></div>
                </div>
                
                <div class="entity-box">
                    <div class="entity-header hist">📜 グループ名変更履歴 (時系列)</div>
                    <div class="f-row pk"><span>id</span><span class="f-type">PK (Number)</span></div>
                    <div class="f-row fk"><span>groupId</span><span class="f-type">FK ➔ グループ</span></div>
                    <div class="f-row"><span>oldName</span><span class="f-type">Text</span></div>
                    <div class="f-row"><span>newName</span><span class="f-type">Text</span></div>
                </div>
                
                <div class="entity-box">
                    <div class="entity-header">🎸 ライブマスタ</div>
                    <div class="f-row pk"><span>id</span><span class="f-type">PK (Number)</span></div>
                    <div class="f-row"><span>name</span><span class="f-type">Text</span></div>
                    <div class="f-row fk"><span>venueId</span><span class="f-type">FK ➔ 会場</span></div>
                </div>
            </div>
            </div>`;

        container.innerHTML = html;
    }
};

window.app = app;
window.onload = function() { app.init(); };
