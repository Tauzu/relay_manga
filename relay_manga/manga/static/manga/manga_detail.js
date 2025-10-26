document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("network");

    const nodes = new vis.DataSet(window.mangaNodes);
    const edges = new vis.DataSet(window.mangaEdges);

    const data = { nodes, edges };

    const options = {
        layout: {
            hierarchical: {
                enabled: true,
                direction: "UD",          // 上→下
                sortMethod: "directed",
                levelSeparation: 150,     // 各階層の縦間隔
                nodeSpacing: 120,         // 同一階層の横間隔
                blockShifting: false,     // ✅ レベルをまたいだ調整を無効化
                edgeMinimization: false,  // ✅ 枝交差によるズレを防ぐ
                parentCentralization: false // ✅ 親の自動中央寄せをオフ
            }
        },
        physics: { enabled: false }, // ✅ 物理演算を無効にしてズレを防止
        nodes: {
            shape: "box",
            margin: 10,
            font: { multi: true, size: 16 },
            color: { background: "#fff", border: "#ccc" }
        },
        edges: { arrows: "to", smooth: false, color: { color: "#aaa" } },
        interaction: { hover: true }
    };

    const network = new vis.Network(container, data, options);

    // ✅ カスタムツールチップ
    const tooltip = document.getElementById("tooltip");

    network.on("hoverNode", (params) => {
        const node = nodes.get(params.node);
        if (node && node.imageUrl) {
            tooltip.innerHTML = `<img src="${node.imageUrl}" width="100" height="100" style="object-fit:cover;">`;
            tooltip.style.left = (params.event.pageX + 10) + "px";
            tooltip.style.top = (params.event.pageY + 10) + "px";
            tooltip.style.display = "block";
        }
    });

    network.on("blurNode", () => {
        tooltip.style.display = "none";
    });

    // ノードクリックイベント
    network.on("click", function (params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            window.location.href = `/viewer/${nodeId}/`;  // ✅ viewer ページへ遷移
        }
    });
});
