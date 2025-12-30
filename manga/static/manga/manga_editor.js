let canvas;
let isDrawingMode = false;
let currentTool = 'select';
let panelsApplied = false;

// ズーム・パン管理
let scale = 1;
let translateX = 0;
let translateY = 0;
let isPanning = false;
let lastTouchDistance = 0;
let panStartX = 0;
let panStartY = 0;

const MIN_SCALE = 0.1;
const MAX_SCALE = 10;
const ZOOM_SPEED = 0.05;

// URLパラメータで再編集モードかどうかを判定
const urlParams = new URLSearchParams(window.location.search);
const isEditMode = urlParams.has('edit');
const isAIMode = urlParams.has('ai');  // AI生成画像モード

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    canvas = new fabric.Canvas('manga-canvas', {
        width: 800,
        height: 800,
        backgroundColor: '#ffffff',
        enableRetinaScaling: false
    });
    
    fabric.Object.prototype.set({
        transparentCorners: false,
        borderColor: '#2196F3',
        cornerColor: '#2196F3',
        cornerSize: 10
    });

    // AI生成画像モードの場合
    if (isAIMode) {
        const aiImage = sessionStorage.getItem('aiGeneratedImage');
        if (aiImage) {
            console.log('AI画像モード: 画像を読み込み中...');
            isLoadingHistory = true;
            
            // AI画像を背景として読み込む
            fabric.Image.fromURL(aiImage, function(img) {
                console.log('AI画像読み込み完了');
                
                // キャンバスサイズに合わせてスケール調整
                const scale = Math.min(
                    canvas.width / img.width,
                    canvas.height / img.height
                );
                
                img.set({
                    scaleX: scale,
                    scaleY: scale,
                    left: (canvas.width - img.width * scale) / 2,
                    top: (canvas.height - img.height * scale) / 2,
                    selectable: false,
                    evented: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    lockRotation: true,
                    lockScalingFlip: true,
                    hasControls: false,
                    hasBorders: true,
                });
                
                canvas.add(img);
                canvas.renderAll();
                
                // 再編集モードと同じ処理
                panelsApplied = true;
                switchToDrawingMode();
                fitCanvasToScreen();
                isLoadingHistory = false;
                
                // 初期状態を保存（再編集モードと同じ）
                saveState();
                
                console.log('AI画像モード初期化完了');
                console.log('描画ツール有効化: panelsApplied=', panelsApplied);
                console.log('ツールバー表示: step2-section=', document.getElementById('step2-section').style.display);
                
                // AI画像をセッションから削除（一度使ったら削除）
                sessionStorage.removeItem('aiGeneratedImage');
            }, null, { crossOrigin: 'anonymous' });
            
            setupEventListeners();
            setupZoomAndPan();
            return;
        } else {
            console.error('AI画像がセッションに見つかりません');
        }
    }

    // 既存の絵がある場合で、かつ再編集モードの場合のみ読み込む
    const savedDrawing = sessionStorage.getItem('mangaDrawing');
    if (savedDrawing && isEditMode) {
        isLoadingHistory = true;  // フラグON
        canvas.loadFromJSON(savedDrawing, function() {
            // コマ枠を固定
            lockPanelFrames();
            canvas.renderAll();
            panelsApplied = true;
            switchToDrawingMode();
            fitCanvasToScreen();
            isLoadingHistory = false;  // フラグOFF
            // 再編集時は履歴に初期状態を保存
            saveState();
        });
    } else {
        if (!isEditMode && !isAIMode) {
            sessionStorage.removeItem('mangaDrawing');
        }
        updatePanelPreview();
        fitCanvasToScreen();
        // 新規作成時も初期状態を保存
        saveState();
    }

    setupEventListeners();
    setupZoomAndPan();
});

// キャンバスを画面に収める
function fitCanvasToScreen() {
    const wrapper = document.querySelector('.canvas-wrapper');
    const container = document.querySelector('.canvas-container');
    
    const wrapperWidth = wrapper.clientWidth;
    const wrapperHeight = wrapper.clientHeight;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // 余白を考慮したスケール計算
    const scaleX = (wrapperWidth - 40) / canvasWidth;
    const scaleY = (wrapperHeight - 40) / canvasHeight;
    scale = Math.min(scaleX, scaleY, 1); // 最大1倍まで
    
    translateX = 0;
    translateY = 0;
    
    updateCanvasTransform();
}

// キャンバスの変換を適用
function updateCanvasTransform() {
    const container = document.querySelector('.canvas-container');
    container.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    
    // ズームレベル表示を更新
    const zoomLevel = document.querySelector('.zoom-level');
    if (zoomLevel) {
        zoomLevel.textContent = Math.round(scale * 100) + '%';
    }
}

// ズーム・パン機能のセットアップ
function setupZoomAndPan() {
    const wrapper = document.querySelector('.canvas-wrapper');
    const container = document.querySelector('.canvas-container');
    
    // マウスホイールでズーム
    wrapper.addEventListener('wheel', function(e) {
        e.preventDefault();
        
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const oldScale = scale;
        const delta = e.deltaY > 0 ? -ZOOM_SPEED : ZOOM_SPEED;
        scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));
        
        // マウス位置を中心にズーム
        const scaleChange = scale / oldScale;
        translateX = e.clientX - (e.clientX - translateX) * scaleChange;
        translateY = e.clientY - (e.clientY - translateY) * scaleChange;
        
        updateCanvasTransform();
    }, { passive: false });
    
    // タッチでのピンチズーム・パン
    let touchStartDistance = 0;
    let touchStartScale = 1;
    let touchStartTranslateX = 0;
    let touchStartTranslateY = 0;
    let touchCenterX = 0;
    let touchCenterY = 0;
    
    wrapper.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
            // 2本指の場合は常にズーム・パン可能（描画モードでも）
            e.preventDefault();
            
            // 描画モードの場合は一時的に無効化
            const wasDrawingMode = canvas.isDrawingMode;
            if (wasDrawingMode) {
                canvas.isDrawingMode = false;
            }
            
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            touchStartDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            
            touchCenterX = (touch1.clientX + touch2.clientX) / 2;
            touchCenterY = (touch1.clientY + touch2.clientY) / 2;
            
            touchStartScale = scale;
            touchStartTranslateX = translateX;
            touchStartTranslateY = translateY;
        }
    }, { passive: false });
    
    wrapper.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2) {
            // 2本指操作は常に有効
            e.preventDefault();
            
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            const currentDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            
            const currentCenterX = (touch1.clientX + touch2.clientX) / 2;
            const currentCenterY = (touch1.clientY + touch2.clientY) / 2;
            
            // ズーム
            const scaleChange = currentDistance / touchStartDistance;
            scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, touchStartScale * scaleChange));
            
            // パン（ピンチ中心を基準に）
            translateX = touchStartTranslateX + (currentCenterX - touchCenterX);
            translateY = touchStartTranslateY + (currentCenterY - touchCenterY);
            
            updateCanvasTransform();
        }
    }, { passive: false });
    
    wrapper.addEventListener('touchend', function(e) {
        if (e.touches.length < 2) {
            touchStartDistance = 0;
            
            // 描画モードに戻す必要がある場合
            if (currentTool === 'pencil' || currentTool === 'eraser') {
                setTimeout(() => {
                    if (e.touches.length === 0) {
                        canvas.isDrawingMode = true;
                    }
                }, 50);
            }
        }
    });
    
    // マウスドラッグでパン（選択ツール時、中クリックまたはスペースキー押下時）
    let isMousePanning = false;
    let mouseStartX = 0;
    let mouseStartY = 0;
    let spacePressed = false;
    
    document.addEventListener('keydown', function(e) {
        if (e.code === 'Space' && !e.repeat) {
            spacePressed = true;
            wrapper.style.cursor = 'grab';
        }
    });
    
    document.addEventListener('keyup', function(e) {
        if (e.code === 'Space') {
            spacePressed = false;
            wrapper.style.cursor = '';
            isMousePanning = false;
        }
    });
    
    wrapper.addEventListener('mousedown', function(e) {
        if ((e.button === 1 || (e.button === 0 && spacePressed)) && currentTool === 'select') {
            e.preventDefault();
            isMousePanning = true;
            mouseStartX = e.clientX - translateX;
            mouseStartY = e.clientY - translateY;
            wrapper.style.cursor = 'grabbing';
        }
    });
    
    wrapper.addEventListener('mousemove', function(e) {
        if (isMousePanning) {
            e.preventDefault();
            translateX = e.clientX - mouseStartX;
            translateY = e.clientY - mouseStartY;
            updateCanvasTransform();
        }
    });
    
    wrapper.addEventListener('mouseup', function(e) {
        if (e.button === 1 || (e.button === 0 && isMousePanning)) {
            isMousePanning = false;
            wrapper.style.cursor = spacePressed ? 'grab' : '';
        }
    });
    
    // ズームボタン
    document.getElementById('zoom-in').addEventListener('click', function() {
        scale = Math.min(MAX_SCALE, scale + 0.1);
        updateCanvasTransform();
    });
    
    document.getElementById('zoom-out').addEventListener('click', function() {
        scale = Math.max(MIN_SCALE, scale - 0.1);
        updateCanvasTransform();
    });
    
    document.getElementById('zoom-reset').addEventListener('click', function() {
        fitCanvasToScreen();
    });
}

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
    
    // プレビュー更新時は履歴に保存しない
    // （コマ割り適用ボタンを押した時のみ保存）
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
    
    // イベント一時停止フラグ
    canvas._isAddingPanels = true;
    
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
                hasControls: false,
                isPanelFrame: true  // コマ枠として識別するフラグ
            });
            canvas.add(rect);
        }
    }
    
    canvas.renderAll();
    
    // フラグを解除してから保存
    canvas._isAddingPanels = false;
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
    // ツールバー切替
    document.getElementById('toolbar-toggle').addEventListener('click', function() {
        const toolbar = document.querySelector('.toolbar');
        toolbar.classList.toggle('hidden');
    });
    
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
    
    // 自由描画完了時のみ履歴を保存
    canvas.on('path:created', function() {
        saveState();
    });
    
    // その他のオブジェクト追加時（図形・テキストなど）
    // ※自由描画（path）は上記で処理済みなので除外
    // ※コマ枠追加中も除外
    canvas.on('object:added', function(e) {
        if (canvas._isAddingPanels) return;  // コマ枠追加中はスキップ
        
        if (e.target && !e.target.isTemporary && e.target.type !== 'path' && !e.target.isPanelFrame) {
            saveState();
        }
    });
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
            canvas.selection = false;
            canvas.on('mouse:down', handleTextClick);
            break;
            
        case 'rect':
            canvas.defaultCursor = 'crosshair';
            canvas.selection = false;
            startShapeDrawing('rect');
            break;
            
        case 'circle':
            canvas.defaultCursor = 'crosshair';
            canvas.selection = false;
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
        
        setTool('select');
    });
}

// テキスト追加
function handleTextClick(o) {
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
            textBaseline: 'middle'
        });
        canvas.add(textObj);
        canvas.setActiveObject(textObj);
        canvas.renderAll();
    }
    
    closeTextInput();
    setTool('select');
}

function closeTextInput() {
    document.getElementById('text-input-overlay').style.display = 'none';
    document.getElementById('text-content').value = '';
}

// 履歴管理
let history = [];
let historyStep = -1;
let isLoadingHistory = false;  // Undo/Redo実行中フラグ

function saveState() {
    // Undo/Redo実行中は保存しない
    if (isLoadingHistory) return;
    
    // 現在の位置より後ろの履歴を削除
    if (historyStep < history.length - 1) {
        history = history.slice(0, historyStep + 1);
    }
    
    // カスタムプロパティ（isPanelFrame）も含めて保存
    history.push(JSON.stringify(canvas.toJSON(['isPanelFrame'])));
    historyStep = history.length - 1;
    
    updateHistoryButtons();
}

function undo() {
    if (historyStep > 0) {
        console.log('Undo: before', historyStep);
        historyStep--;
        console.log('Undo: after', historyStep);
        
        isLoadingHistory = true;  // フラグON
        canvas.loadFromJSON(history[historyStep], function() {
            // コマ枠を再度固定
            lockPanelFrames();
            canvas.renderAll();
            isLoadingHistory = false;  // フラグOFF
            updateHistoryButtons();
        });
    } else {
        console.log('Undo: cannot undo, historyStep=', historyStep);
    }
}

function redo() {
    if (historyStep < history.length - 1) {
        console.log('Redo: before', historyStep);
        historyStep++;
        console.log('Redo: after', historyStep);
        
        isLoadingHistory = true;  // フラグON
        canvas.loadFromJSON(history[historyStep], function() {
            // コマ枠を再度固定
            lockPanelFrames();
            canvas.renderAll();
            isLoadingHistory = false;  // フラグOFF
            updateHistoryButtons();
        });
    } else {
        console.log('Redo: cannot redo, historyStep=', historyStep, 'length=', history.length);
    }
}

function updateHistoryButtons() {
    document.getElementById('undo-btn').disabled = historyStep <= 0;
    document.getElementById('redo-btn').disabled = historyStep >= history.length - 1;
    
    // デバッグ用（本番環境では削除可能）
    console.log(`History: step=${historyStep}, length=${history.length}, undo=${historyStep > 0}, redo=${historyStep < history.length - 1}`);
}

// コマ枠を固定する関数
function lockPanelFrames() {
    canvas.getObjects().forEach(obj => {
        if (obj.isPanelFrame) {
            obj.selectable = false;
            obj.evented = false;
            obj.lockMovementX = true;
            obj.lockMovementY = true;
            obj.hasControls = false;
        }
    });
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
        panelsApplied = false;
        
        updatePanelPreview();
        // クリア後の初期状態を保存
        saveState();
        
        document.getElementById('step1-section').style.display = 'flex';
        document.getElementById('step2-section').style.display = 'none';
        document.getElementById('brush-section').style.display = 'none';
        document.getElementById('history-section').style.display = 'none';
        document.getElementById('action-section').style.display = 'none';
    }
}

// 保存
function saveImage() {
    // カスタムプロパティも含めて保存
    const canvasData = JSON.stringify(canvas.toJSON(['isPanelFrame']));
    sessionStorage.setItem('mangaDrawing', canvasData);
    
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