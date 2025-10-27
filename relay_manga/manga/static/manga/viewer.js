document.addEventListener("DOMContentLoaded", () => {
    const image = document.getElementById("viewer-image");
    const title = document.getElementById("viewer-title");
    const idSpan = document.getElementById("viewer-id");
    const likeForm = document.getElementById("like-form");
    const likeButton = document.getElementById("like-button");
    const likeCount = document.getElementById("like-count");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");

    // 🔹 ページデータをサーバーから受け取る
    const pages = window.viewerPages || [];
    let currentIndex = window.initialIndex || 0; // ✅ 初期ページを現在のノードに設定

    // ✅ ページ切り替え処理
    function updateViewer(newIndex, direction = "next") {
        if (newIndex < 0 || newIndex >= pages.length) return;

        const newPage = pages[newIndex];

        // 🔹 フェードアニメーション
        image.classList.add(
        "opacity-0",
        direction === "next" ? "translate-x-10" : "-translate-x-10"
        );
        setTimeout(() => {
        image.src = newPage.image;
        title.textContent = newPage.title;
        idSpan.textContent = newPage.id;
        likeCount.textContent = newPage.likes;
        likeForm.action = newPage.like_url;

        image.classList.remove("opacity-0", "translate-x-10", "-translate-x-10");
        image.classList.add("opacity-100");
        }, 250);

        // ✅ ボタン状態更新
        currentIndex = newIndex;
        updateButtonStates();
    }

    // ✅ ボタンの有効／無効状態を切り替え
    function updateButtonStates() {
        const isFirst = currentIndex === 0;
        const isLast = currentIndex === pages.length - 1;

        prevBtn.disabled = isFirst;
        nextBtn.disabled = isLast;

        // グレーアウト＋無反応化
        [prevBtn, nextBtn].forEach((btn, i) => {
        const disabled = btn.disabled;
        btn.classList.toggle("opacity-40", disabled);
        btn.classList.toggle("cursor-default", disabled);
        btn.classList.toggle("hover:bg-gray-200", !disabled);
        btn.style.pointerEvents = disabled ? "none" : "auto"; // ✅ 無反応に
        });
    }

    // ✅ 矢印ボタン制御
    prevBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (currentIndex > 0) updateViewer(currentIndex - 1, "prev");
    });

    nextBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (currentIndex < pages.length - 1) updateViewer(currentIndex + 1, "next");
    });

    // 🌿 分岐ボタン制御
    const branchToggle = document.getElementById("branch-toggle");
    const branchMenu = document.getElementById("branch-menu");

    if (branchToggle && branchMenu) {
    branchToggle.addEventListener("click", async () => {
        branchMenu.classList.toggle("hidden");

        // すでに開いていたら閉じる
        if (!branchMenu.classList.contains("hidden")) {
        // 現在のページIDを取得
        const currentPage = pages[currentIndex];
        const res = await fetch(`/page/${currentPage.id}/branches/`);
        const data = await res.json();

        // メニュー初期化
        branchMenu.innerHTML = "";
        if (data.branches.length === 0) {
            branchMenu.innerHTML = `<div class="px-3 py-2 text-sm text-gray-500">分岐はありません。</div>`;
            return;
        }

        // 分岐項目を追加
        data.branches.forEach(b => {
            const item = document.createElement("a");
            item.href = `/page/${b.id}/viewer/`;
            item.className = "block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100";
            item.textContent = `${b.title} by ${b.author}（優先度: ${b.priority}）`;
            branchMenu.appendChild(item);
        });
        }
    });

    // 外クリックで閉じる
    document.addEventListener("click", e => {
        if (!branchToggle.contains(e.target) && !branchMenu.contains(e.target)) {
        branchMenu.classList.add("hidden");
        }
    });
    }

    // ✅ いいね処理
    likeForm.addEventListener("submit", function (event) {
        event.preventDefault();
        fetch(this.action, {
        method: "POST",
        headers: {
            "X-CSRFToken": this.querySelector("[name=csrfmiddlewaretoken]").value,
            "X-Requested-With": "XMLHttpRequest",
        },
        })
        .then((response) => {
            if (response.redirected) {
            alert("いいねするにはログインが必要です。");
            window.location.href = response.url;
            return;
            }
            return response.json();
        })
        .then((data) => {
            if (!data) return;
            likeCount.textContent = data.likes;
            if (data.already) {
            likeButton.disabled = true;
            likeButton.textContent = "👍 いいね済み";
            }
        });
    });

    // ✅ 初期状態
    updateViewer(currentIndex);
    updateButtonStates();
});
