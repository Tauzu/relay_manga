document.addEventListener("DOMContentLoaded", () => {
    const title = document.getElementById("viewer-title");
    const likeForm = document.getElementById("like-form");
    const likeButton = document.getElementById("like-button");
    const likeCount = document.getElementById("like-count");
    const treeToggle = document.getElementById("tree-toggle");
    const continueLink = document.getElementById("continue-link");
    
    // ツリービュー関連の要素を最初に宣言
    const treeModal = document.getElementById('tree-modal');
    const treeCloseBtn = document.getElementById('tree-close-btn');
    const treeNetworkContainer = document.getElementById('tree-network');
    const treeTooltip = document.getElementById('tree-tooltip');
    let treeNetwork = null;

    const pages = window.viewerPages || [];
    let currentIndex = window.initialIndex || 0;

    /* 🟦 Splide 初期化 */
    const splide = new Splide("#image-splide", {
        type: "slide",
        start: currentIndex,
        arrows: true,
        pagination: false,
        rewind: false,
    });

    /* 🟦 ページ情報更新 */
    function updateViewer(newIndex) {
        const page = pages[newIndex];
        if (!page) return;

        title.textContent = page.title;
        document.getElementById("viewer-author").textContent = page.author;
        likeCount.textContent = page.likes;
        likeForm.action = page.like_url;
        continueLink.href = `/page/${page.id}/continue/`;

        const counter = document.getElementById("page-counter");
        counter.textContent = `${newIndex + 1} / ${pages.length}`;

        // うぃーねの状態
        const storageKey = `liked_page_${page.id}`;
        if (localStorage.getItem(storageKey)) {
            likeButton.disabled = true;
            likeButton.textContent = "👍 うぃーね済み";
        } else {
            likeButton.disabled = false;
            likeButton.textContent = "👍 うぃーね";
        }

        // 分岐が複数ある場合はボタンを緑色に
        if (page.children && page.children.length > 1) {
            treeToggle.classList.add('has-branches');
        } else {
            treeToggle.classList.remove('has-branches');
        }

        currentIndex = newIndex;
        
        // ツリービューが開いている場合は現在ページをハイライト
        if (treeModal.classList.contains('active')) {
            highlightCurrentNode(page.id);
        }
    }

    /* 🟦 Splide が移動したらページ情報を同期 */
    splide.on("moved", (newIndex) => {
        updateViewer(newIndex);
    });

    splide.mount();

    /* 初期表示 */
    updateViewer(currentIndex);

    /* うぃーね処理 */
    likeForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const currentPage = pages[currentIndex];
        const storageKey = `liked_page_${currentPage.id}`;

        if (localStorage.getItem(storageKey)) return;

        fetch(this.action, {
            method: "POST",
            headers: {
                "X-CSRFToken": this.querySelector("[name=csrfmiddlewaretoken]").value,
                "X-Requested-With": "XMLHttpRequest",
            },
        })
            .then((res) => res.json())
            .then((data) => {
                likeCount.textContent = data.likes;
                localStorage.setItem(storageKey, "1");
                likeButton.disabled = true;
                likeButton.textContent = "👍 うぃーね済み";
            });
    });

    /* ==================== ツリービュー機能 ==================== */

    // ツリービューモーダルを開く
    treeToggle.addEventListener("click", () => {
        treeModal.classList.add('active');
        
        // ネットワークがまだ作成されていない場合は作成
        if (!treeNetwork) {
            initTreeNetwork();
        } else {
            // 既に作成済みの場合は現在ページをハイライト
            highlightCurrentNode(pages[currentIndex].id);
        }
    });

    // モーダルを閉じる
    treeCloseBtn.addEventListener("click", () => {
        treeModal.classList.remove('active');
    });

    // モーダル背景クリックで閉じる
    treeModal.addEventListener("click", (e) => {
        if (e.target === treeModal) {
            treeModal.classList.remove('active');
        }
    });

    // ツリーネットワークを初期化
    function initTreeNetwork() {
        const nodes = new vis.DataSet(window.treeNodes.map(n => {
            const isCurrentPage = n.id === pages[currentIndex].id;
            return {
                ...n,
                image: n.imageUrl,
                shape: "image",
                size: 50,
                borderWidth: isCurrentPage ? 3 : 1,
                color: {
                    border: isCurrentPage ? '#22c55e' : '#999',
                    background: isCurrentPage ? '#22c55e' : '#ffffff'
                },
                shapeProperties: {
                    useBorderWithImage: true
                }
            };
        }));

        const edges = new vis.DataSet(window.treeEdges);

        const data = { nodes, edges };

        const options = {
            layout: {
                hierarchical: {
                    enabled: true,
                    direction: "UD",
                    sortMethod: "directed",
                    levelSeparation: 150,
                    nodeSpacing: 120,
                    blockShifting: false,
                    edgeMinimization: false,
                    parentCentralization: false
                }
            },
            physics: { enabled: false },
            nodes: {
                shape: "image",
                size: 50,
                borderWidth: 1,
                color: { 
                    border: "#999",
                    background: "#ffffff"
                },
                shapeProperties: {
                    useBorderWithImage: true
                }
            },
            edges: { 
                arrows: "to", 
                smooth: false, 
                color: { color: "#aaa" } 
            },
            interaction: {
                hover: true,
                dragNodes: false
            }
        };

        treeNetwork = new vis.Network(treeNetworkContainer, data, options);

        // ツールチップ表示
        treeNetwork.on("hoverNode", (params) => {
            const node = nodes.get(params.node);
            if (!node) return;

            const title = node.title || "タイトル不明";
            const author = node.author || "作者不明";

            treeTooltip.innerHTML = `
                <div style="font-weight:bold;">${title}</div>
                <div style="color:#666;">${author}</div>
            `;
            treeTooltip.style.left = params.event.pageX + 10 + "px";
            treeTooltip.style.top = params.event.pageY + 10 + "px";
            treeTooltip.style.display = "block";
        });

        treeNetwork.on("blurNode", () => {
            treeTooltip.style.display = "none";
        });

        // ノードクリックでビューアページに遷移
        treeNetwork.on("click", (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                window.location.href = `/page/${nodeId}/viewer/`;
            }
        });

        // レンダリング完了後に現在のページにフォーカス
        treeNetwork.on("afterDrawing", function() {
            // 一度だけ実行
            treeNetwork.off("afterDrawing");
            
            setTimeout(() => {
                treeNetwork.focus(pages[currentIndex].id, {
                    scale: 1.2,
                    animation: {
                        duration: 600,
                        easingFunction: 'easeInOutQuad'
                    }
                });
            }, 50);
        });
    }

    // 現在のノードをハイライト
    function highlightCurrentNode(pageId) {
        if (!treeNetwork) return;

        const nodes = treeNetwork.body.data.nodes;
        const allNodeIds = nodes.getIds();
        
        // すべてのノードを通常の状態に戻す
        allNodeIds.forEach(nodeId => {
            nodes.update({
                id: nodeId,
                color: { 
                    border: '#999',
                    background: '#ffffff'
                },
                borderWidth: 1,
                size: 50
            });
        });

        // 現在のページを強調表示
        nodes.update({
            id: pageId,
            color: { 
                border: '#22c55e',
                background: '#22c55e'
            },
            borderWidth: 3,
            size: 50
        });

        // 現在のページにフォーカス
        treeNetwork.focus(pageId, {
            scale: 1.2,
            animation: {
                duration: 600,
                easingFunction: 'easeInOutQuad'
            }
        });
    }
});