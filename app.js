let players = [];
let rounds = [];
let currentRoundIndex = 0;
let presets = [];
let defaultPreset = null;
let currentView = "setup-view";

const BOMB_TYPES = [
    { label: "3张", factor: 2 },
    { label: "4张", factor: 4 },
    { label: "5张", factor: 8 },
    { label: "6张", factor: 16 },
    { label: "7张", factor: 32 },
];

const STORAGE_KEY = "qiguai523_data";

function saveToStorage() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ players, rounds, currentRoundIndex, presets, defaultPreset, currentView })
    );
}

function loadFromStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
}

function clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
}

function showModal(message, buttons) {
    const overlay = document.getElementById("modal-overlay");
    const messageEl = document.getElementById("modal-message");
    const actionsEl = document.getElementById("modal-actions");

    messageEl.textContent = message;
    actionsEl.innerHTML = "";

    buttons.forEach((btn) => {
        const button = document.createElement("button");
        button.className = `btn ${btn.className || "btn-outline"}`;
        button.textContent = btn.text;
        button.onclick = () => {
            overlay.style.display = "none";
            if (btn.onClick) btn.onClick();
        };
        actionsEl.appendChild(button);
    });

    overlay.style.display = "flex";
}

function alertModal(message, onOk) {
    showModal(message, [{ text: "确定", className: "btn-primary", onClick: onOk }]);
}

function confirmModal(message, onConfirm, onCancel) {
    showModal(message, [
        { text: "取消", className: "btn-outline", onClick: onCancel },
        { text: "确定", className: "btn-primary", onClick: onConfirm },
    ]);
}

function init() {
    const saved = loadFromStorage();
    if (saved) {
        presets = saved.presets || [];
        defaultPreset = saved.defaultPreset || null;
        currentView = saved.currentView || "setup-view";
    }

    if (saved && saved.players && saved.players.length >= 2) {
        players = saved.players;
        rounds = saved.rounds || [];
        currentRoundIndex = saved.currentRoundIndex || 0;
        buildScoreTable();

        if (currentView === "setup-view") {
            initSetup();
            switchView("setup-view");
        } else if (currentView === "summary-view") {
            buildSummaryTable();
            switchView("summary-view");
        } else {
            switchView("game-view");
            loadRound(currentRoundIndex);
        }
    } else {
        // 没有进行中的游戏，尝试加载默认组合
        if (defaultPreset) {
            const preset = presets.find((p) => p.name === defaultPreset);
            if (preset && preset.players.length >= 2) {
                players = [...preset.players];
            }
        }
        currentView = "setup-view";
        initSetup();
        switchView("setup-view");
    }
}

function switchView(viewId) {
    currentView = viewId;
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    document.getElementById(viewId).classList.add("active");
    saveToStorage();
}

function initSetup() {
    const list = document.getElementById("player-list");
    list.innerHTML = "";

    if (players.length === 0) {
        for (let i = 1; i <= 4; i++) {
            addPlayerInput(`玩家${i}`);
        }
    } else {
        players.forEach((p) => addPlayerInput(p));
    }

    renderPresets();
}

function renderPresets() {
    const container = document.getElementById("preset-list");
    if (!container) return;
    container.innerHTML = "";

    if (presets.length === 0) {
        container.innerHTML = `<span class="preset-empty">暂无固定组合</span>`;
        return;
    }

    presets.forEach((preset) => {
        const chip = document.createElement("div");
        chip.className = "preset-chip";
        if (defaultPreset === preset.name) {
            chip.classList.add("active");
        }

        const isDefault = defaultPreset === preset.name;
        chip.innerHTML = `
            <span onclick="applyPreset('${preset.name}')">${preset.name}</span>
            ${isDefault ? '<span class="default-mark"><i class="fa-solid fa-star"></i></span>' : ""}
            <span class="preset-actions">
                <button onclick="event.stopPropagation(); setDefaultPreset('${preset.name}')" title="设为默认"><i class="fa-solid fa-star"></i></button>
                <button onclick="event.stopPropagation(); deletePreset('${preset.name}')" title="删除"><i class="fa-solid fa-trash-can"></i></button>
            </span>
        `;
        chip.onclick = (e) => {
            if (e.target.tagName !== "BUTTON") {
                applyPreset(preset.name);
            }
        };
        container.appendChild(chip);
    });
}

function applyPreset(name) {
    const preset = presets.find((p) => p.name === name);
    if (!preset || preset.players.length < 2) return;

    players = [...preset.players];
    rounds = [];
    currentRoundIndex = 0;

    const list = document.getElementById("player-list");
    list.innerHTML = "";
    players.forEach((p) => addPlayerInput(p));

    saveToStorage();
}

function doSavePreset(nameInput, name, currentPlayers) {
    const existingIndex = presets.findIndex((p) => p.name === name);
    if (existingIndex >= 0) {
        presets[existingIndex].players = currentPlayers;
    } else {
        presets.push({ name, players: currentPlayers });
    }

    nameInput.value = "";
    saveToStorage();
    renderPresets();
}

function saveCurrentAsPreset() {
    const nameInput = document.getElementById("preset-name");
    const name = nameInput.value.trim();
    if (!name) {
        alertModal("请输入组合名称");
        return;
    }

    const inputs = document.querySelectorAll(".player-row input");
    const currentPlayers = [];
    inputs.forEach((inp) => {
        const n = inp.value.trim();
        if (n) currentPlayers.push(n);
    });

    if (currentPlayers.length < 2) {
        alertModal("至少需要两名玩家才能保存组合");
        return;
    }

    const existingIndex = presets.findIndex((p) => p.name === name);
    if (existingIndex >= 0) {
        confirmModal(
            `组合 "${name}" 已存在，是否覆盖？`,
            () => doSavePreset(nameInput, name, currentPlayers),
            null
        );
        return;
    }

    doSavePreset(nameInput, name, currentPlayers);
}

function setDefaultPreset(name) {
    defaultPreset = name;
    saveToStorage();
    renderPresets();
}

function deletePreset(name) {
    confirmModal(`确定删除组合 "${name}" 吗？`, () => {
        presets = presets.filter((p) => p.name !== name);
        if (defaultPreset === name) {
            defaultPreset = presets.length > 0 ? presets[0].name : null;
        }
        saveToStorage();
        renderPresets();
    });
}

function addPlayerInput(defaultName = "") {
    const list = document.getElementById("player-list");
    const row = document.createElement("div");
    row.className = "player-row";
    row.innerHTML = `
        <input type="text" placeholder="玩家姓名" value="${defaultName}">
        <button class="btn btn-danger-outline" onclick="removePlayerRow(this)" title="删除"><i class="fa-solid fa-trash-can"></i></button>
    `;
    list.appendChild(row);
}

function removePlayerRow(btn) {
    const rows = document.querySelectorAll(".player-row");
    if (rows.length <= 2) {
        alertModal("至少需要两名玩家");
        return;
    }
    btn.parentElement.remove();
}

function openSetup() {
    confirmModal("重新设置玩家将清除当前所有对局数据，是否继续？", () => {
        players = [];
        rounds = [];
        currentRoundIndex = 0;
        saveToStorage();
        initSetup();
        switchView("setup-view");
    });
}

function startGame() {
    const inputs = document.querySelectorAll(".player-row input");
    const newPlayers = [];
    inputs.forEach((inp) => {
        const name = inp.value.trim();
        if (name) newPlayers.push(name);
    });

    if (newPlayers.length < 2) {
        alertModal("至少需要两名玩家");
        return;
    }

    const unique = new Set(newPlayers);
    if (unique.size !== newPlayers.length) {
        alertModal("玩家姓名不能重复");
        return;
    }

    // 调整已有轮次的玩家数量
    if (players.length > 0 && newPlayers.length !== players.length) {
        rounds.forEach((rd) => {
            if (newPlayers.length > players.length) {
                for (let i = players.length; i < newPlayers.length; i++) {
                    rd.scores.push(0);
                }
            } else {
                rd.scores = rd.scores.slice(0, newPlayers.length);
            }
        });
    }

    players = newPlayers;

    if (rounds.length === 0) {
        rounds = [
            {
                scores: new Array(players.length).fill(0),
                multiplier: 1,
                factors: [],
            },
        ];
        currentRoundIndex = 0;
    }

    saveToStorage();
    buildScoreTable();
    switchView("game-view");
    loadRound(currentRoundIndex);
}

function restartGame() {
    confirmModal("确定要重新开始吗？当前所有数据将被清空。", () => {
        players = [];
        rounds = [];
        currentRoundIndex = 0;
        saveToStorage();
        initSetup();
        switchView("setup-view");
    });
}

function deleteCurrentRound() {
    if (rounds.length <= 1) {
        alertModal("至少保留一局");
        return;
    }

    confirmModal(`确定删除第 ${currentRoundIndex + 1} 局吗？`, () => {
        rounds.splice(currentRoundIndex, 1);
        if (currentRoundIndex >= rounds.length) {
            currentRoundIndex = rounds.length - 1;
        }
        saveToStorage();
        loadRound(currentRoundIndex);
    });
}

function buildScoreTable() {
    const table = document.getElementById("score-table");
    table.innerHTML = "";

    const tbl = document.createElement("table");
    tbl.className = "score-table-inner";

    let html = `<thead><tr><th class="score-th-empty"></th>`;
    players.forEach((p) => {
        html += `<th class="score-th-player">${p}</th>`;
    });
    html += `<th class="score-th-multiplier"></th></tr></thead>`;

    html += `<tbody>`;

    html += `<tr class="score-tr-base"><td class="score-td-label">原分数</td>`;
    players.forEach((_, i) => {
        html += `<td class="score-td-input"><input type="text" class="score-input" id="input-${i}" value="0" oninput="updateDisplay()"></td>`;
    });
    html += `<td class="score-td-multiplier" rowspan="2">
        <div class="multiplier-box">
            <div class="multiplier-value" id="multiplier-value">×1</div>
            <div class="multiplier-actions">
                <button class="btn btn-sm btn-outline" onclick="undoMultiplier()">撤销</button>
                <button class="btn btn-sm btn-danger-outline" onclick="resetMultiplier()">重置</button>
            </div>
        </div>
    </td></tr>`;

    html += `<tr class="score-tr-final"><td class="score-td-label">翻倍后分数</td>`;
    players.forEach((_, i) => {
        html += `<td class="score-td-final"><div class="score-final zero" id="final-${i}">0</div></td>`;
    });
    html += `</tr>`;

    html += `</tbody>`;
    tbl.innerHTML = html;
    table.appendChild(tbl);
}

function updateDisplay() {
    const rd = rounds[currentRoundIndex];
    let total = 0;

    players.forEach((_, i) => {
        const inp = document.getElementById(`input-${i}`);
        const finalEl = document.getElementById(`final-${i}`);

        let val = parseInt(inp.value, 10);
        if (isNaN(val)) val = 0;

        rd.scores[i] = val;
        const final = val * rd.multiplier;
        total += final;

        finalEl.textContent = final;
        finalEl.classList.remove("positive", "negative", "zero");
        if (final > 0) finalEl.classList.add("positive");
        else if (final < 0) finalEl.classList.add("negative");
        else finalEl.classList.add("zero");
    });

    document.getElementById("multiplier-value").textContent = `×${rd.multiplier}`;
    document.getElementById("round-total").textContent = total;
    saveToStorage();
}

function addBomb(factor) {
    const rd = rounds[currentRoundIndex];
    rd.multiplier *= factor;
    rd.factors.push(factor);
    updateDisplay();
}

function undoMultiplier() {
    const rd = rounds[currentRoundIndex];
    if (rd.factors.length > 0) {
        const last = rd.factors.pop();
        rd.multiplier = Math.max(1, rd.multiplier / last);
    }
    updateDisplay();
}

function resetMultiplier() {
    const rd = rounds[currentRoundIndex];
    rd.multiplier = 1;
    rd.factors = [];
    updateDisplay();
}

function loadRound(index) {
    currentRoundIndex = index;
    const rd = rounds[index];

    document.getElementById(
        "round-badge"
    ).textContent = `第 ${index + 1} 局 / 共 ${rounds.length} 局`;

    players.forEach((_, i) => {
        const inp = document.getElementById(`input-${i}`);
        if (inp) inp.value = rd.scores[i] || 0;
    });

    updateDisplay();
    document.getElementById("prev-btn").disabled = index === 0;
}

function prevRound() {
    if (currentRoundIndex > 0) {
        loadRound(currentRoundIndex - 1);
    }
}

function nextRound() {
    if (currentRoundIndex === rounds.length - 1) {
        rounds.push({
            scores: new Array(players.length).fill(0),
            multiplier: 1,
            factors: [],
        });
    }
    loadRound(currentRoundIndex + 1);
}

function isBlankRound(rd) {
    return rd.scores.every((s) => s === 0) && rd.multiplier === 1;
}

function hasBlankRounds() {
    return rounds.some((rd) => isBlankRound(rd));
}

function removeBlankRounds() {
    rounds = rounds.filter((rd) => !isBlankRound(rd));
    if (rounds.length === 0) {
        rounds.push({
            scores: new Array(players.length).fill(0),
            multiplier: 1,
            factors: [],
        });
    }
    if (currentRoundIndex >= rounds.length) {
        currentRoundIndex = rounds.length - 1;
    }
    saveToStorage();
}

function showSummary() {
    updateDisplay();

    if (!hasBlankRounds()) {
        buildSummaryTable();
        switchView("summary-view");
        return;
    }

    confirmModal("是否去除空白对局？", () => {
        removeBlankRounds();
        buildSummaryTable();
        switchView("summary-view");
    }, () => {
        buildSummaryTable();
        switchView("summary-view");
    });
}

function backToGame() {
    const scoreTable = document.getElementById("score-table");
    if (!scoreTable || scoreTable.children.length === 0) {
        buildScoreTable();
    }
    switchView("game-view");
    loadRound(currentRoundIndex);
}

function buildSummaryTable() {
    const container = document.getElementById("summary-table");
    const totals = new Array(players.length).fill(0);

    const dynWidth = `calc((100% - 138px) / ${players.length + 1})`;
    let html = `<table class="summary-table"><colgroup><col style="width:48px"><col style="width:90px">`;
    players.forEach(() => (html += `<col style="width:${dynWidth}">`));
    html += `<col style="width:${dynWidth}"></colgroup><thead><tr><th colspan="2"></th>`;
    players.forEach((p) => (html += `<th>${p}</th>`));
    html += `<th>倍数</th></tr></thead><tbody>`;

    rounds.forEach((rd, i) => {
        html += `<tr>`;
        html += `<td class="round-cell" rowspan="2">${i + 1}</td>`;
        html += `<td class="row-label">原分数</td>`;

        rd.scores.forEach((score) => {
            html += `<td>${score}</td>`;
        });

        html += `<td class="multiplier-cell" rowspan="2">×${rd.multiplier}</td>`;
        html += `</tr>`;

        html += `<tr><td class="row-label">翻倍后分数</td>`;
        rd.scores.forEach((score, j) => {
            const final = score * rd.multiplier;
            totals[j] += final;
            const cls = final > 0 ? "positive" : final < 0 ? "negative" : "";
            html += `<td class="final-cell ${cls}">${final}</td>`;
        });
        html += `</tr>`;
    });

    html += `<tr class="total-row">`;
    html += `<td colspan="2" class="total-label">总计</td>`;
    totals.forEach((t) => {
        const cls = t > 0 ? "positive" : t < 0 ? "negative" : "zero";
        html += `<td class="${cls}">${t}</td>`;
    });
    html += `</tr>`;

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function exportExcel() {
    if (typeof XLSX === "undefined") {
        alertModal("Excel 导出库未加载，请检查网络连接。");
        return;
    }

    const wb = XLSX.utils.book_new();
    const data = [];
    const merges = [];
    const colCount = 3 + players.length;

    const FONT_CN = "华文中宋";
    const FONT_EN = "CMU Roman";
    const font = (sz, bold, color) => ({
        name: `${FONT_CN}, ${FONT_EN}`,
        sz,
        bold: !!bold,
        color: color ? { rgb: color } : undefined,
    });

    const align = { horizontal: "center", vertical: "center", wrapText: false };
    const cellStyle = (f, bg) => {
        const s = { font: f, alignment: align };
        if (bg) s.fill = { patternType: "solid", fgColor: { rgb: bg } };
        return s;
    };

    const headerFont = font(15, true, "1E293B");
    const roundFont = font(18, true, "B45309");
    const labelFont = font(15, false, "64748B");
    const scoreFont = font(15, false, "1E293B");
    const finalFont = (val) => font(16, true, val > 0 ? "047857" : val < 0 ? "B91C1C" : "64748B");
    const mulFont = font(18, true, "1D4ED8");
    const totalLabelFont = font(18, true, "1E293B");
    const totalValueFont = font(16, true, "1E293B");

    // Header
    const headerRow = ["", "", ...players, "倍数"];
    data.push(headerRow);

    // Rounds
    rounds.forEach((rd, i) => {
        const baseRow = data.length;
        const row1 = [i + 1, "原分数", ...rd.scores, `×${rd.multiplier}`];
        data.push(row1);
        merges.push({ s: { r: baseRow, c: 0 }, e: { r: baseRow + 1, c: 0 } });
        merges.push({ s: { r: baseRow, c: colCount - 1 }, e: { r: baseRow + 1, c: colCount - 1 } });

        const finals = rd.scores.map((s) => s * rd.multiplier);
        const row2 = ["", "翻倍后分数", ...finals, ""];
        data.push(row2);
    });

    // Total
    const totals = players.map((_, j) =>
        rounds.reduce((sum, rd) => sum + rd.scores[j] * rd.multiplier, 0)
    );
    const totalRow = ["总计", "", ...totals, ""];
    data.push(totalRow);
    merges.push({ s: { r: data.length - 1, c: 0 }, e: { r: data.length - 1, c: 1 } });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!merges"] = merges;

    // Column widths (approximate px / 7)
    const colWidths = [{ wch: 7 }, { wch: 13 }];
    players.forEach(() => colWidths.push({ wch: 16 }));
    colWidths.push({ wch: 16 });
    ws["!cols"] = colWidths;

    // Row heights (approximate px * 0.75)
    const rowHeights = [{ hpt: 33 }];
    for (let i = 0; i < rounds.length * 2; i++) {
        rowHeights.push({ hpt: 33 });
    }
    rowHeights.push({ hpt: 33 });
    ws["!rows"] = rowHeights;

    // Apply styles
    for (let r = 0; r < data.length; r++) {
        for (let c = 0; c < colCount; c++) {
            const cellRef = XLSX.utils.encode_cell({ r, c });
            if (!ws[cellRef]) ws[cellRef] = { v: "" };

            if (r === 0) {
                ws[cellRef].s = cellStyle(headerFont);
            } else if (c === 0) {
                const isTotal = ws[cellRef].v === "总计";
                ws[cellRef].s = cellStyle(isTotal ? totalLabelFont : roundFont);
            } else if (c === 1) {
                const isTotalRow = r === data.length - 1;
                ws[cellRef].s = cellStyle(isTotalRow ? totalLabelFont : labelFont);
            } else if (c === colCount - 1) {
                ws[cellRef].s = cellStyle(mulFont);
            } else {
                const val = ws[cellRef].v;
                const isTotalRow = r === data.length - 1;
                if (isTotalRow) {
                    const bg = val > 0 ? "D1FAE5" : val < 0 ? "FEE2E2" : "F1F5F9";
                    ws[cellRef].s = cellStyle(totalValueFont, bg);
                } else if (r % 2 === 0) {
                    // 原分数行
                    ws[cellRef].s = cellStyle(scoreFont);
                } else {
                    // 翻倍后分数行
                    ws[cellRef].s = cellStyle(finalFont(val));
                }
            }
        }
    }

    XLSX.utils.book_append_sheet(wb, ws, "计分表");
    XLSX.writeFile(wb, "七怪五二三计分表.xlsx");
}

function exportImage() {
    const tableEl = document.getElementById("summary-table");
    if (!tableEl) return;

    if (typeof html2canvas === "undefined") {
        alertModal("图片导出库未加载，请检查网络连接。");
        return;
    }

    html2canvas(tableEl, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
    }).then((canvas) => {
        const link = document.createElement("a");
        link.download = "七怪五二三计分表.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    }).catch(() => {
        alertModal("图片导出失败，请重试。");
    });
}

// 启动
init();
