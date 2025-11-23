const canvas = document.getElementById('manga-canvas');
const canvasContainer = document.getElementById('canvas-container');
const ctx = canvas.getContext('2d');
let isDrawing = false;
let currentTool = 'pencil';
let brushSize = 3;
let fontSize = 20;
let panelsApplied = false;

// テキストボックス管理
let textBoxes = [];
let textBoxIdCounter = 0;

// Undo/Redo用の履歴
let history = [];
let historyStep = -1;

// 初期化: キャンバスを白で塗りつぶし
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// URLパラメータで再編集モードかどうかを判定
const urlParams = new URLSearchParams(window.location.search);
const isEditMode = urlParams.has('edit');

// 既存の絵がある場合で、かつ再編集モードの場合のみ読み込む
const savedDrawing = sessionStorage.getItem('mangaDrawing');
if (savedDrawing && isEditMode) {
    const img = new Image();
    img.onload = () => {
        ctx.drawImage(img, 0, 0);
        panelsApplied = true;
        document.getElementById('step1-section').style.display = 'none';
        document.getElementById('step2-section').style.display = 'flex';
        document.getElementById('brush-size-section').style.display = 'flex';
        document.getElementById('font-size-section').style.display = 'flex';
        document.getElementById('history-section').style.display = 'flex';
        document.getElementById('action-section').style.display = 'flex';
        saveState();
    };
    img.src = savedDrawing;
} else {
    if (!isEditMode) {
        sessionStorage.removeItem('mangaDrawing');
    }
    updatePanelPreview();
}

// 履歴を保存
function saveState() {
    historyStep++;
    if (historyStep < history.length) {
        history.length = historyStep;
    }
    history.push({
        canvas: canvas.toDataURL(),
        textBoxes: JSON.parse(JSON.stringify(textBoxes))
    });
    updateHistoryButtons();
}

// 履歴ボタンの有効/無効を更新
function updateHistoryButtons() {
    document.getElementById('undo-btn').disabled = historyStep <= 0;
    document.getElementById('redo-btn').disabled = historyStep >= history.length - 1;
}

// Undo
document.getElementById('undo-btn').addEventListener('click', () => {
    if (historyStep > 0) {
        historyStep--;
        const state = history[historyStep];
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            textBoxes = JSON.parse(JSON.stringify(state.textBoxes));
            renderTextBoxes();
            updateHistoryButtons();
        };
        img.src = state.canvas;
    }
});

// Redo
document.getElementById('redo-btn').addEventListener('click', () => {
    if (historyStep < history.length - 1) {
        historyStep++;
        const state = history[historyStep];
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            textBoxes = JSON.parse(JSON.stringify(state.textBoxes));
            renderTextBoxes();
            updateHistoryButtons();
        };
        img.src = state.canvas;
    }
});

// コマ割りプレビュー（段数・列数変更時）
function updatePanelPreview() {
    const rows = parseInt(document.getElementById('panel-rows').value);
    const cols = parseInt(document.getElementById('panel-cols').value);
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const margin = 20;
    const usableWidth = canvas.width - (margin * (cols + 1));
    const usableHeight = canvas.height - (margin * (rows + 1));
    const panelWidth = usableWidth / cols;
    const panelHeight = usableHeight / rows;
    
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = margin + col * (panelWidth + margin);
            const y = margin + row * (panelHeight + margin);
            ctx.strokeRect(x, y, panelWidth, panelHeight);
        }
    }
}

// 段数・列数変更時にプレビュー更新
document.getElementById('panel-rows').addEventListener('change', updatePanelPreview);
document.getElementById('panel-cols').addEventListener('change', updatePanelPreview);

// ツール切り替え
document.getElementById('tool-pencil').addEventListener('click', () => {
    currentTool = 'pencil';
    updateToolButtons();
});

document.getElementById('tool-eraser').addEventListener('click', () => {
    currentTool = 'eraser';
    updateToolButtons();
});

document.getElementById('tool-text').addEventListener('click', () => {
    currentTool = 'text';
    updateToolButtons();
});

function updateToolButtons() {
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    if (currentTool === 'pencil') document.getElementById('tool-pencil').classList.add('active');
    if (currentTool === 'eraser') document.getElementById('tool-eraser').classList.add('active');
    if (currentTool === 'text') document.getElementById('tool-text').classList.add('active');
}

// ブラシサイズ
const brushSizeInput = document.getElementById('brush-size');
const brushSizeValue = document.getElementById('brush-size-value');
brushSizeInput.addEventListener('input', (e) => {
    brushSize = parseInt(e.target.value);
    brushSizeValue.textContent = brushSize;
});

// フォントサイズ（ツールバー用）
const fontSizeInput = document.getElementById('font-size');
const fontSizeValue = document.getElementById('font-size-value');
fontSizeInput.addEventListener('input', (e) => {
    fontSize = parseInt(e.target.value);
    fontSizeValue.textContent = fontSize;
});

// テキスト入力のフォントサイズ
const textFontSizeInput = document.getElementById('text-font-size');
const textFontSizeValue = document.getElementById('text-font-size-value');
textFontSizeInput.addEventListener('input', (e) => {
    textFontSizeValue.textContent = e.target.value + 'px';
});

// コマ割り適用
document.getElementById('apply-panels').addEventListener('click', () => {
    const rows = parseInt(document.getElementById('panel-rows').value);
    const cols = parseInt(document.getElementById('panel-cols').value);
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const margin = 20;
    const usableWidth = canvas.width - (margin * (cols + 1));
    const usableHeight = canvas.height - (margin * (rows + 1));
    const panelWidth = usableWidth / cols;
    const panelHeight = usableHeight / rows;
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = margin + col * (panelWidth + margin);
            const y = margin + row * (panelHeight + margin);
            ctx.strokeRect(x, y, panelWidth, panelHeight);
        }
    }
    
    saveState();
    panelsApplied = true;
    
    document.getElementById('step1-section').style.display = 'none';
    document.getElementById('step2-section').style.display = 'flex';
    document.getElementById('brush-size-section').style.display = 'flex';
    document.getElementById('font-size-section').style.display = 'flex';
    document.getElementById('history-section').style.display = 'flex';
    document.getElementById('action-section').style.display = 'flex';
});

// 描画処理
let lastX = 0;
let lastY = 0;

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

// タッチ操作用の変数
let touches = [];

function handleTouchStart(e) {
    if (e.touches.length >= 2) {
        if (isDrawing) {
            stopDrawing();
        }
        return;
    }
    
    if (!panelsApplied) return;
    
    if (e.touches.length === 1) {
        if (currentTool === 'text') {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            showTextInput(mouseEvent);
            e.preventDefault();
            return;
        }
        
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }
}

function handleTouchMove(e) {
    if (e.touches.length >= 2) {
        if (isDrawing) {
            isDrawing = false;
        }
        return;
    }
    
    if (e.touches.length === 1 && isDrawing) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }
}

function handleTouchEnd(e) {
    if (e.touches.length === 0 && isDrawing) {
        const mouseEvent = new MouseEvent('mouseup', {});
        canvas.dispatchEvent(mouseEvent);
    }
}

function startDrawing(e) {
    if (!panelsApplied) return;
    
    if (currentTool === 'text') {
        showTextInput(e);
        return;
    }
    
    isDrawing = true;
    const pos = getMousePos(e);
    lastX = pos.x;
    lastY = pos.y;
}

function draw(e) {
    if (!isDrawing) return;
    
    e.preventDefault();
    
    const pos = getMousePos(e);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    
    if (currentTool === 'pencil') {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = brushSize;
    } else if (currentTool === 'eraser') {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = brushSize * 2;
    }
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    lastX = pos.x;
    lastY = pos.y;
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        saveState();
    }
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

// テキスト入力
let textClickPos = null;
let editingTextBoxId = null;

function showTextInput(e) {
    textClickPos = getMousePos(e);
    const textFontSize = parseInt(document.getElementById('text-font-size').value);
    document.getElementById('text-font-size').value = fontSize;
    document.getElementById('text-font-size-value').textContent = fontSize + 'px';
    document.getElementById('text-input-overlay').style.display = 'flex';
    document.getElementById('text-content').focus();
}

// テキストボックスを描画
function renderTextBoxes() {
    document.querySelectorAll('.text-box').forEach(el => el.remove());
    
    textBoxes.forEach(box => {
        const textBoxEl = document.createElement('div');
        textBoxEl.className = 'text-box';
        textBoxEl.style.left = box.x + 'px';
        textBoxEl.style.top = box.y + 'px';
        textBoxEl.dataset.id = box.id;
        
        const contentEl = document.createElement('div');
        contentEl.className = 'text-box-content';
        contentEl.textContent = box.text;
        contentEl.style.fontSize = box.fontSize + 'px';
        
        const controlsEl = document.createElement('div');
        controlsEl.className = 'text-box-controls';
        
        const editBtn = document.createElement('div');
        editBtn.className = 'text-box-btn';
        editBtn.textContent = '✎';
        editBtn.title = '編集';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editTextBox(box.id);
        });
        
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'text-box-btn delete';
        deleteBtn.textContent = '×';
        deleteBtn.title = '削除';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTextBox(box.id);
        });
        
        controlsEl.appendChild(editBtn);
        controlsEl.appendChild(deleteBtn);
        
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'text-box-resize';
        
        textBoxEl.appendChild(contentEl);
        textBoxEl.appendChild(controlsEl);
        textBoxEl.appendChild(resizeHandle);
        
        let tapTimeout;
        textBoxEl.addEventListener('click', (e) => {
            if (e.target === textBoxEl || e.target === contentEl) {
                clearTimeout(tapTimeout);
                tapTimeout = setTimeout(() => {
                    editTextBox(box.id);
                }, 300);
            }
        });
        
        // PC: マウスドラッグ
        let isDragging = false;
        let isResizing = false;
        let startX, startY, startWidth, startHeight, startFontSize;
        
        textBoxEl.addEventListener('mousedown', (e) => {
            if (e.target === resizeHandle) {
                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = textBoxEl.offsetWidth;
                startHeight = textBoxEl.offsetHeight;
                startFontSize = box.fontSize;
            } else if (e.target === textBoxEl || e.target === contentEl) {
                isDragging = true;
                startX = e.clientX - box.x;
                startY = e.clientY - box.y;
            }
            e.stopPropagation();
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging && textBoxEl.dataset.id == box.id) {
                box.x = e.clientX - startX;
                box.y = e.clientY - startY;
                textBoxEl.style.left = box.x + 'px';
                textBoxEl.style.top = box.y + 'px';
            } else if (isResizing && textBoxEl.dataset.id == box.id) {
                const deltaX = e.clientX - startX;
                const scale = 1 + (deltaX / startWidth);
                box.fontSize = Math.max(12, Math.min(60, Math.round(startFontSize * scale)));
                contentEl.style.fontSize = box.fontSize + 'px';
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging || isResizing) {
                isDragging = false;
                isResizing = false;
                saveState();
            }
        });
        
        // スマホ: タッチドラッグ
        let touchStartX, touchStartY;
        let isTouchDragging = false;
        let isTouchResizing = false;
        
        textBoxEl.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            
            if (e.target === resizeHandle) {
                isTouchResizing = true;
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
                startWidth = textBoxEl.offsetWidth;
                startFontSize = box.fontSize;
                e.preventDefault();
            } else if (e.target === textBoxEl || e.target === contentEl) {
                isTouchDragging = true;
                touchStartX = touch.clientX - box.x;
                touchStartY = touch.clientY - box.y;
                e.preventDefault();
            }
        }, { passive: false });
        
        textBoxEl.addEventListener('touchmove', (e) => {
            if (isTouchDragging && textBoxEl.dataset.id == box.id) {
                const touch = e.touches[0];
                box.x = touch.clientX - touchStartX;
                box.y = touch.clientY - touchStartY;
                textBoxEl.style.left = box.x + 'px';
                textBoxEl.style.top = box.y + 'px';
                e.preventDefault();
            } else if (isTouchResizing && textBoxEl.dataset.id == box.id) {
                const touch = e.touches[0];
                const deltaX = touch.clientX - touchStartX;
                const scale = 1 + (deltaX / startWidth);
                box.fontSize = Math.max(12, Math.min(60, Math.round(startFontSize * scale)));
                contentEl.style.fontSize = box.fontSize + 'px';
                e.preventDefault();
            }
        }, { passive: false });
        
        textBoxEl.addEventListener('touchend', (e) => {
            if (isTouchDragging || isTouchResizing) {
                isTouchDragging = false;
                isTouchResizing = false;
                saveState();
            }
        });
        
        canvasContainer.appendChild(textBoxEl);
    });
}

function editTextBox(id) {
    const box = textBoxes.find(b => b.id === id);
    if (!box) return;
    
    editingTextBoxId = id;
    document.getElementById('text-content').value = box.text;
    document.getElementById('text-font-size').value = box.fontSize;
    document.getElementById('text-font-size-value').textContent = box.fontSize + 'px';
    document.getElementById('text-input-overlay').style.display = 'flex';
    document.getElementById('text-content').focus();
}

function deleteTextBox(id) {
    textBoxes = textBoxes.filter(b => b.id !== id);
    renderTextBoxes();
    saveState();
}

document.getElementById('text-ok').addEventListener('click', () => {
    const text = document.getElementById('text-content').value.trim();
    const textFontSize = parseInt(document.getElementById('text-font-size').value);
    
    if (text) {
        if (editingTextBoxId !== null) {
            const box = textBoxes.find(b => b.id === editingTextBoxId);
            if (box) {
                box.text = text;
                box.fontSize = textFontSize;
            }
        } else if (textClickPos) {
            textBoxes.push({
                id: textBoxIdCounter++,
                text: text,
                x: textClickPos.x,
                y: textClickPos.y,
                fontSize: textFontSize
            });
        }
        renderTextBoxes();
        saveState();
    }
    closeTextInput();
});

document.getElementById('text-cancel').addEventListener('click', closeTextInput);

function closeTextInput() {
    document.getElementById('text-input-overlay').style.display = 'none';
    document.getElementById('text-content').value = '';
    textClickPos = null;
    editingTextBoxId = null;
}

// クリア
document.getElementById('clear-canvas').addEventListener('click', () => {
    if (confirm('本当にクリアしますか？')) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        textBoxes = [];
        history = [];
        historyStep = -1;
        updatePanelPreview();
        renderTextBoxes();
        panelsApplied = false;
        document.getElementById('step1-section').style.display = 'flex';
        document.getElementById('step2-section').style.display = 'none';
        document.getElementById('brush-size-section').style.display = 'none';
        document.getElementById('font-size-section').style.display = 'none';
        document.getElementById('history-section').style.display = 'none';
        document.getElementById('action-section').style.display = 'none';
    }
});

// 保存（テキストボックスをキャンバスに描画してから保存）
document.getElementById('save-image').addEventListener('click', () => {
    textBoxes.forEach(box => {
        ctx.fillStyle = '#000';
        ctx.font = `${box.fontSize}px sans-serif`;
        ctx.fillText(box.text, box.x, box.y + box.fontSize);
    });
    
    canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            sessionStorage.setItem('mangaDrawing', reader.result);
            const parentId = document.body.dataset.parentId;
            const mangaId = document.body.dataset.mangaId;
            
            if (parentId) {
                window.location.href = `/page/${parentId}/continue/?edit=1`;
            } else {
                window.location.href = `/${mangaId}/create/?edit=1`;
            }
        };
        reader.readAsDataURL(blob);
    });
});

// 戻るボタン
document.getElementById('back-btn').addEventListener('click', () => {
    if (confirm('本当に戻りますか？現在の内容は破棄されます。')) {
        const parentId = document.body.dataset.parentId;
        const mangaId = document.body.dataset.mangaId;
        
        if (parentId) {
            window.location.href = `/page/${parentId}/continue/`;
        } else {
            window.location.href = `/${mangaId}/create/`;
        }
    }
});