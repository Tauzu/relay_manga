let canvas;
let isDrawingMode = false;
let currentTool = 'select';
let panelsApplied = false;

// ズーム・パン関連
let viewportTransform = { x: 0, y: 0, scale: 1 };
let isPanning = false;
let lastPanX = 0;
let lastPanY = 0;

// タッチ関連
let lastTouchDistance = 0;
let lastTouchCenter = { x: 0, y: 0 };

// URLパラメータで再編集モードかどうかを判定
const urlParams = new URLSearchParams(window.location.search);
const isEditMode = urlParams.has('edit');

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    canvas = new fabric.Canvas('manga-canvas', {
        width: 800,
        height: 800,
        backgroundColor: '#ffffff',
        enableRetinaScaling: false // Retinaスケーリングを無効化して警告を回避
    });
    
    // textBaselineの警告を回避
    fabric.Object.prototype.set({
        transparentCorners: false,
        borderColor: '#2196F3',
        cornerColor: '#2196F3',
        cornerSize: 10
    });

    // 既存の絵がある場合で、かつ再編集モードの場合のみ読み込む
    const savedDrawing = sessionStorage.getItem('mangaDrawing');
    if (savedDrawing && isEditMode) {
        canvas.loadFromJSON(savedDrawing, function() {
            canvas.renderAll();
            panelsApplied = true;
            switchToDrawingMode();
        });
    } else {
        if (!isEditMode) {
            sessionStorage.removeItem('mangaDrawing');
        }
        updatePanelPreview();
    }

    setupEventListeners();
    setupZoomAndPan();
});

// コマ割りプレビュー
function updatePanelPreview() {
    const rows = parseInt(document.getElementById('panel-rows').value);
    const cols = parseInt(document.getElementById('panel-cols').value);
    
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    
    const margin = 20;
    const usableWidth = canvas.width - (margin * (cols + 1));
    const usableHeight = canvas.height - (margin * (rows + 1));
    const panelWidth = usableWidth / cols;
    const panelHeight = usableHeight / rows;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = margin + col * (panelWidth + margin);
            const y = margin + row * (panelHeight + margin);
            
            const rect = new fabric.Rect({
                left: x,
                top: y,
                width: panelWidth,
                height: panelHeight,
                fill: 'transparent',
                stroke: '#ccc',
                strokeWidth: 2,
                selectable: false,
                evented: false
            });
            canvas.add(rect);
        }
    }
    canvas.renderAll();
}

// コマ割り適用
document.getElementById('apply-panels').addEventListener('click', function() {
    const rows = parseInt(document.getElementById('panel-rows').value);
    const cols = parseInt(document.getElementById('panel-cols').value);
    
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    
    const margin = 20;
    const usableWidth = canvas.width - (margin * (cols + 1));
    const usableHeight = canvas.height - (margin * (rows + 1));
    const panelWidth = usableWidth / cols;
    const panelHeight = usableHeight / rows;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = margin + col * (panelWidth + margin);
            const y = margin + row * (panelHeight + margin);
            
            const rect = new fabric.Rect({
                left: x,
                top: y,
                width: panelWidth,
                height: panelHeight,
                fill: 'transparent',
                stroke: '#000',
                strokeWidth: 3,
                selectable: false,
                evented: false,
                lockMovementX: true,
                lockMovementY: true,
                hasControls: false
            });
            canvas.add(rect);
        }
    }
    
    canvas.renderAll();
    saveState();
    panelsApplied = true;
    switchToDrawingMode();
});

function switchToDrawingMode() {
    document.getElementById('step1-section').style.display = 'none';
    document.getElementById('step2-section').style.display = 'flex';
    document.getElementById('brush-section').style.display = 'flex';
    document.getElementById('history-section').style.display = 'flex';
    document.getElementById('action-section').style.display = 'flex';
}

// イベントリスナー設定
function setupEventListeners() {
    // ツール切り替え
    document.getElementById('tool-select').addEventListener('click', () => setTool('select'));
    document.getElementById('tool-pencil').addEventListener('click', () => setTool('pencil'));
    document.getElementById('tool-eraser').addEventListener('click', () => setTool('eraser'));
    document.getElementById('tool-text').addEventListener('click', () => setTool('text'));
    document.getElementById('tool-rect').addEventListener('click', () => setTool('rect'));
    document.getElementById('tool-circle').addEventListener('click', () => setTool('circle'));
    
    // ブラシサイズ
    document.getElementById('brush-size').addEventListener('input', function(e) {
        const size = parseInt(e.target.value);
        document.getElementById('brush-size-value').textContent = size;
        if (canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush.width = size;
        }
    });
    
    // 履歴操作
    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('redo-btn').addEventListener('click', redo);
    
    // アクション
    document.getElementById('delete-selected').addEventListener('click', deleteSelected);
    document.getElementById('clear-canvas').addEventListener('click', clearCanvas);
    document.getElementById('save-image').addEventListener('click', saveImage);
    document.getElementById('back-btn').addEventListener('click', goBack);
    
    // コマ割り設定変更
    document.getElementById('panel-rows').addEventListener('change', updatePanelPreview);
    document.getElementById('panel-cols').addEventListener('change', updatePanelPreview);
    
    // テキスト入力
    document.getElementById('text-ok').addEventListener('click', addTextToCanvas);
    document.getElementById('text-cancel').addEventListener('click', closeTextInput);
    
    // Fabricイベント
    canvas.on('object:modified', saveState);
    canvas.on('object:added', function(e) {
        if (e.target && !e.target.isTemporary) {
            saveState();
        }
    });
}

// ズーム・パン機能の設定
function setupZoomAndPan() {
    const canvasWrapper = document.querySelector('.canvas-wrapper');
    const canvasContainer = canvas.wrapperEl;
    
    // ズームボタン
    document.getElementById('zoom-in').addEventListener('click', () => {
        zoomCanvas(1.2);
    });
    
    document.getElementById('zoom-out').addEventListener('click', () => {
        zoomCanvas(0.8);
    });
    
    document.getElementById('zoom-reset').addEventListener('click', () => {
        resetZoom();
    });
    
    // マウスホイールでズーム（PC）
    canvasWrapper.addEventListener('wheel', function(e) {
        e.preventDefault();
        const delta = e.deltaY;
        const zoomFactor = delta > 0 ? 0.9 : 1.1;
        zoomCanvas(zoomFactor, e.offsetX, e.offsetY);
    }, { passive: false });
    
    // マウスでパン（スペースキー + ドラッグ または 中クリックドラッグ）
    let spacePressed = false;
    
    document.addEventListener('keydown', function(e) {
        if (e.code === 'Space' && !e.repeat) {
            spacePressed = true;
            canvasContainer.style.cursor = 'grab';
        }
    });
    
    document.addEventListener('keyup', function(e) {
        if (e.code === 'Space') {
            spacePressed = false;
            canvasContainer.style.cursor = currentTool === 'select' ? 'default' : canvas.defaultCursor;
        }
    });
    
    canvasWrapper.addEventListener('mousedown', function(e) {
        if (spacePressed || e.button === 1) { // スペース押下中 または 中クリック
            e.preventDefault();
            isPanning = true;
            lastPanX = e.clientX;
            lastPanY = e.clientY;
            canvasContainer.classList.add('panning');
        }
    });
    
    canvasWrapper.addEventListener('mousemove', function(e) {
        if (isPanning) {
            const dx = e.clientX - lastPanX;
            const dy = e.clientY - lastPanY;
            
            viewportTransform.x += dx;
            viewportTransform.y += dy;
            
            updateCanvasTransform();
            
            lastPanX = e.clientX;
            lastPanY = e.clientY;
        }
    });
    
    canvasWrapper.addEventListener('mouseup', function() {
        if (isPanning) {
            isPanning = false;
            canvasContainer.classList.remove('panning');
        }
    });
    
    // タッチでズーム・パン（スマホ・タブレット）
    let touches = [];
    
    canvasWrapper.addEventListener('touchstart', function(e) {
        touches = Array.from(e.touches);
        
        if (touches.length === 2) {
            // ピンチ開始
            e.preventDefault();
            lastTouchDistance = getTouchDistance(touches[0], touches[1]);
            lastTouchCenter = getTouchCenter(touches[0], touches[1]);
        } else if (touches.length === 1 && currentTool === 'select') {
            // 1本指パン（選択モード時のみ）
            lastPanX = touches[0].clientX;
            lastPanY = touches[0].clientY;
            
            // 少し待ってから判定（描画と区別）
            setTimeout(() => {
                if (touches.length === 1) {
                    isPanning = true;
                }
            }, 100);
        }
    }, { passive: false });
    
    canvasWrapper.addEventListener('touchmove', function(e) {
        touches = Array.from(e.touches);
        
        if (touches.length === 2) {
            // ピンチズーム
            e.preventDefault();
            
            const currentDistance = getTouchDistance(touches[0], touches[1]);
            const currentCenter = getTouchCenter(touches[0], touches[1]);
            
            const zoomFactor = currentDistance / lastTouchDistance;
            
            // ズーム中心点を計算
            const rect = canvasWrapper.getBoundingClientRect();
            const centerX = currentCenter.x - rect.left;
            const centerY = currentCenter.y - rect.top;
            
            zoomCanvas(zoomFactor, centerX, centerY);
            
            // パンも同時に行う
            const dx = currentCenter.x - lastTouchCenter.x;
            const dy = currentCenter.y - lastTouchCenter.y;
            viewportTransform.x += dx;
            viewportTransform.y += dy;
            updateCanvasTransform();
            
            lastTouchDistance = currentDistance;
            lastTouchCenter = currentCenter;
        } else if (touches.length === 1 && isPanning) {
            // 1本指パン
            e.preventDefault();
            
            const dx = touches[0].clientX - lastPanX;
            const dy = touches[0].clientY - lastPanY;
            
            viewportTransform.x += dx;
            viewportTransform.y += dy;
            updateCanvasTransform();
            
            lastPanX = touches[0].clientX;
            lastPanY = touches[0].clientY;
        }
    }, { passive: false });
    
    canvasWrapper.addEventListener('touchend', function(e) {
        touches = Array.from(e.touches);
        
        if (touches.length < 2) {
            lastTouchDistance = 0;
        }
        
        if (touches.length === 0) {
            isPanning = false;
        }
    });
}

// ズーム処理
function zoomCanvas(factor, centerX, centerY) {
    const oldScale = viewportTransform.scale;
    const newScale = Math.min(Math.max(oldScale * factor, 0.1), 5); // 10%〜500%
    
    if (centerX !== undefined && centerY !== undefined) {
        // ズーム中心点を基準に拡大
        const rect = canvas.wrapperEl.getBoundingClientRect();
        const canvasX = centerX - viewportTransform.x;
        const canvasY = centerY - viewportTransform.y;
        
        viewportTransform.x -= canvasX * (newScale / oldScale - 1);
        viewportTransform.y -= canvasY * (newScale / oldScale - 1);
    }
    
    viewportTransform.scale = newScale;
    updateCanvasTransform();
}

// ズームリセット
function resetZoom() {
    viewportTransform = { x: 0, y: 0, scale: 1 };
    updateCanvasTransform();
}

// キャンバスの変形を更新
function updateCanvasTransform() {
    const canvasContainer = canvas.wrapperEl;
    canvasContainer.style.transform = 
        `translate(${viewportTransform.x}px, ${viewportTransform.y}px) scale(${viewportTransform.scale})`;
    
    // ズームレベル表示を更新
    document.getElementById('zoom-level').textContent = 
        Math.round(viewportTransform.scale * 100) + '%';
}

// タッチ間の距離を計算
function getTouchDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// タッチの中心点を計算
function getTouchCenter(touch1, touch2) {
    return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
    };
}

// ツール切り替え
function setTool(tool) {
    currentTool = tool;
    
    // ボタンの状態更新
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tool-${tool}`).classList.add('active');
    
    // 既存のイベントリスナーをクリア
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');
    
    // キャンバスの設定
    canvas.isDrawingMode = false;
    canvas.selection = true;
    
    switch(tool) {
        case 'select':
            canvas.defaultCursor = 'default';
            canvas.hoverCursor = 'move';
            break;
            
        case 'pencil':
            canvas.isDrawingMode = true;
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush.width = parseInt(document.getElementById('brush-size').value);
            canvas.freeDrawingBrush.color = '#000000';
            break;
            
        case 'eraser':
            canvas.isDrawingMode = true;
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush.width = parseInt(document.getElementById('brush-size').value) * 2;
            canvas.freeDrawingBrush.color = '#ffffff';
            break;
            
        case 'text':
            canvas.defaultCursor = 'text';
            canvas.selection = false; // テキストモード中は選択を無効化
            canvas.on('mouse:down', handleTextClick);
            break;
            
        case 'rect':
            canvas.defaultCursor = 'crosshair';
            canvas.selection = false; // 図形描画中は選択を無効化
            startShapeDrawing('rect');
            break;
            
        case 'circle':
            canvas.defaultCursor = 'crosshair';
            canvas.selection = false; // 図形描画中は選択を無効化
            startShapeDrawing('circle');
            break;
    }
}

// 図形描画
let isDrawingShape = false;
let shapeStartX, shapeStartY;
let currentShape;

function startShapeDrawing(type) {
    canvas.on('mouse:down', function(o) {
        // オブジェクトをクリックした場合は無視
        if (o.target) return;
        
        isDrawingShape = true;
        const pointer = canvas.getPointer(o.e);
        shapeStartX = pointer.x;
        shapeStartY = pointer.y;
        
        if (type === 'rect') {
            currentShape = new fabric.Rect({
                left: shapeStartX,
                top: shapeStartY,
                width: 0,
                height: 0,
                fill: 'transparent',
                stroke: '#000000',
                strokeWidth: 3
            });
        } else if (type === 'circle') {
            currentShape = new fabric.Circle({
                left: shapeStartX,
                top: shapeStartY,
                radius: 0,
                fill: 'transparent',
                stroke: '#000000',
                strokeWidth: 3
            });
        }
        
        currentShape.isTemporary = true;
        canvas.add(currentShape);
    });
    
    canvas.on('mouse:move', function(o) {
        if (!isDrawingShape) return;
        
        const pointer = canvas.getPointer(o.e);
        
        if (type === 'rect') {
            const width = pointer.x - shapeStartX;
            const height = pointer.y - shapeStartY;
            
            currentShape.set({
                width: Math.abs(width),
                height: Math.abs(height),
                left: width > 0 ? shapeStartX : pointer.x,
                top: height > 0 ? shapeStartY : pointer.y
            });
        } else if (type === 'circle') {
            const radius = Math.sqrt(
                Math.pow(pointer.x - shapeStartX, 2) + 
                Math.pow(pointer.y - shapeStartY, 2)
            ) / 2;
            currentShape.set({ radius: radius });
        }
        
        canvas.renderAll();
    });
    
    canvas.on('mouse:up', function() {
        if (!isDrawingShape) return;
        
        isDrawingShape = false;
        if (currentShape) {
            currentShape.isTemporary = false;
            currentShape.setCoords();
            saveState();
        }
        
        // 図形描画完了後、選択モードに戻る
        setTool('select');
    });
}

// テキスト追加
function handleTextClick(o) {
    // オブジェクトをクリックした場合は無視
    if (o.target) return;
    
    const pointer = canvas.getPointer(o.e);
    document.getElementById('text-click-x').value = pointer.x;
    document.getElementById('text-click-y').value = pointer.y;
    document.getElementById('text-input-overlay').style.display = 'flex';
    document.getElementById('text-content').focus();
}

function addTextToCanvas() {
    const text = document.getElementById('text-content').value.trim();
    const fontSize = parseInt(document.getElementById('text-font-size').value);
    const x = parseFloat(document.getElementById('text-click-x').value);
    const y = parseFloat(document.getElementById('text-click-y').value);
    
    if (text) {
        const textObj = new fabric.IText(text, {
            left: x,
            top: y,
            fontSize: fontSize,
            fill: '#000000',
            fontFamily: 'sans-serif',
            textBaseline: 'middle' // 警告を回避するために明示的に設定
        });
        canvas.add(textObj);
        canvas.setActiveObject(textObj);
        canvas.renderAll();
    }
    
    closeTextInput();
    
    // テキスト追加後、選択モードに戻る
    setTool('select');
}

function closeTextInput() {
    document.getElementById('text-input-overlay').style.display = 'none';
    document.getElementById('text-content').value = '';
}

// 履歴管理
let history = [];
let historyStep = -1;

function saveState() {
    historyStep++;
    if (historyStep < history.length) {
        history.length = historyStep;
    }
    history.push(JSON.stringify(canvas.toJSON()));
    updateHistoryButtons();
}

function undo() {
    if (historyStep > 0) {
        historyStep--;
        canvas.loadFromJSON(history[historyStep], function() {
            canvas.renderAll();
            updateHistoryButtons();
        });
    }
}

function redo() {
    if (historyStep < history.length - 1) {
        historyStep++;
        canvas.loadFromJSON(history[historyStep], function() {
            canvas.renderAll();
            updateHistoryButtons();
        });
    }
}

function updateHistoryButtons() {
    document.getElementById('undo-btn').disabled = historyStep <= 0;
    document.getElementById('redo-btn').disabled = historyStep >= history.length - 1;
}

// 選択オブジェクト削除
function deleteSelected() {
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
        activeObjects.forEach(obj => canvas.remove(obj));
        canvas.discardActiveObject();
        canvas.renderAll();
        saveState();
    }
}

// キャンバスクリア
function clearCanvas() {
    if (confirm('本当にクリアしますか？')) {
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        history = [];
        historyStep = -1;
        updatePanelPreview();
        panelsApplied = false;
        document.getElementById('step1-section').style.display = 'flex';
        document.getElementById('step2-section').style.display = 'none';
        document.getElementById('brush-section').style.display = 'none';
        document.getElementById('history-section').style.display = 'none';
        document.getElementById('action-section').style.display = 'none';
    }
}

// 保存
function saveImage() {
    // キャンバスの状態を保存
    const canvasData = JSON.stringify(canvas.toJSON());
    sessionStorage.setItem('mangaDrawing', canvasData);
    
    // PNG画像として保存
    const dataURL = canvas.toDataURL('image/png');
    sessionStorage.setItem('mangaDrawingImage', dataURL);
    
    const parentId = document.body.dataset.parentId;
    const mangaId = document.body.dataset.mangaId;
    
    if (parentId) {
        window.location.href = `/page/${parentId}/continue/?edit=1`;
    } else {
        window.location.href = `/${mangaId}/create/?edit=1`;
    }
}

// 戻る
function goBack() {
    if (confirm('本当に戻りますか？現在の内容は破棄されます。')) {
        const parentId = document.body.dataset.parentId;
        const mangaId = document.body.dataset.mangaId;
        
        if (parentId) {
            window.location.href = `/page/${parentId}/continue/`;
        } else {
            window.location.href = `/${mangaId}/create/`;
        }
    }
}