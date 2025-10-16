document.addEventListener("DOMContentLoaded", () => {
    const nodes = new vis.DataSet(window.mangaNodes);
    const edges = new vis.DataSet(window.mangaEdges);
    const container = document.getElementById("network");
    const data = { nodes, edges };

    const options = {
        layout: {
            hierarchical: {
                enabled: true,
                direction: "UD",
                sortMethod: "directed",
                levelSeparation: 180,
                nodeSpacing: 120,
                blockShifting: false,
                parentCentralization: false,
                edgeMinimization: true
            }
        },
        physics: false,
        nodes: {
            shape: "box",
            margin: 10,
            font: { multi: true },
            color: { background: "#fff", border: "#ccc" }
        },
        edges: {
            arrows: "to",
            smooth: { type: "cubicBezier", forceDirection: "vertical", roundness: 0.4 }
        },
        interaction: { hover: true }
    };

    const network = new vis.Network(container, data, options);

    // ✅ ツールチップ
    const tooltip = document.getElementById("tooltip");
    network.on("hoverNode", (params) => {
        const node = nodes.get(params.node);
        if (node && node.imageUrl) {
            tooltip.innerHTML = `<img src="${node.imageUrl}" width="100" height="100" style="object-fit:cover">`;
            tooltip.style.left = `${params.event.pageX + 10}px`;
            tooltip.style.top = `${params.event.pageY + 10}px`;
            tooltip.style.display = "block";
        }
    });
    network.on("blurNode", () => tooltip.style.display = "none");

    // ✅ ノードクリック
    network.on("click", (params) => {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            window.location.href = `/page/${nodeId}/`;
        }
    });
});
