document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("network");

    /* ▼ ノード構造を image ノードに変換 */
    window.mangaNodes = window.mangaNodes.map(n => {
    const { label, ...rest } = n; // ← 受け取ったデータに label があっても除去

        return {
            ...rest,
            image: n.imageUrl,
            shape: "image",
        };
    });

    const nodes = new vis.DataSet(window.mangaNodes);
    const edges = new vis.DataSet(window.mangaEdges);

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

        /* ▼ ノードは画像として表示 */
        nodes: {
            shape: "image",
            size: 50, // 調整可
            borderWidth: 1,
            color: { border: "#ccc" }
        },

        edges: { arrows: "to", smooth: false, color: { color: "#aaa" } },
        
        interaction: {
            hover: true,
            dragNodes: false   // ノード移動禁止
        }

    };

    const network = new vis.Network(container, data, options);

    // 初期位置記録
    const initialView = {
        position: network.getViewPosition(),
        scale: network.getScale()
    };

    // リセットボタン
    const resetButton = document.getElementById("reset-view");
    if (resetButton) {
        resetButton.addEventListener("click", () => {
            network.moveTo({
                position: initialView.position,
                scale: initialView.scale,
                animation: { duration: 600, easingFunction: "easeInOutQuad" }
            });
        });
    }

    // ▼ カスタムツールチップ（タイトル＋作者）
    const tooltip = document.getElementById("tooltip");

    network.on("hoverNode", (params) => {
        const node = nodes.get(params.node);
        if (!node) return;

        const title = node.title || "タイトル不明";
        const author = node.author || "作者不明";

        tooltip.innerHTML = `
            <div style="font-weight:bold;">${title}</div>
            <div style="color:#666;">${author}</div>
        `;
        tooltip.style.left = params.event.pageX + 10 + "px";
        tooltip.style.top = params.event.pageY + 10 + "px";
        tooltip.style.display = "block";
    });

    network.on("blurNode", () => {
        tooltip.style.display = "none";
    });

    // クリックで viewer ページへ
    network.on("click", (params) => {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            window.location.href = `/page/${nodeId}/viewer/`;
        }
    });
});
