document.addEventListener("DOMContentLoaded", () => {
    const image = document.getElementById("viewer-image");
    const title = document.getElementById("viewer-title");
    const idSpan = document.getElementById("viewer-id");
    const likeForm = document.getElementById("like-form");
    const likeButton = document.getElementById("like-button");
    const likeCount = document.getElementById("like-count");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const branchToggle = document.getElementById("branch-toggle");
    const branchMenu = document.getElementById("branch-menu");

    // ===== ページデータ =====
    const pages = window.viewerPages || [];
    let currentIndex = window.initialIndex || 0;

    // ===== 初期チェック =====
    if (!pages.length || !image) {
        console.warn("ページデータまたは画像要素が見つかりません。");
        return;
    }

    // ===== ページ更新処理 =====
    function updateViewer(newIndex, direction = "next") {
        if (newIndex < 0 || newIndex >= pages.length) return;

        const newPage = pages[newIndex];

        // フェードアニメーション
        image.classList.add("opacity-0", direction === "next" ? "translate-x-10" : "-translate-x-10");
        setTimeout(() => {
            image.src = newPage.image;
            title.textContent = newPage.title;
            idSpan.textContent = newPage.id;
            likeCount.textContent = newPage.likes;
            likeForm.action = newPage.like_url;

            // スライド完了後アニメーション解除
            image.classList.remove("opacity-0", "translate-x-10", "-translate-x-10");
            image.classList.add("opacity-100");

            // ✅ ページ表示ごとに「いいね状態」をサーバーに問い合わせ
            fetch(`/page/${newPage.id}/like_status/`, {
                headers: { "X-Requested-With": "XMLHttpRequest" },
            })
                .then(res => res.json())
                .then(data => {
                    likeCount.textContent = data.likes;
                    if (data.liked) {
                        likeButton.disabled = true;
                        likeButton.textContent = "👍 いいね済み";
                    } else {
                        likeButton.disabled = false;
                        likeButton.textContent = "👍 いいね";
                    }
                });

            // ✅ 続きを描くリンク更新
            const continueLink = document.getElementById("continue-link");
            if (continueLink) {
                continueLink.href = `/page/${newPage.id}/continue/`;
            }

        }, 250);

        // 状態更新
        currentIndex = newIndex;
        updateButtonStates();
        updateBranchMenu(newPage);
    }

    // ===== 分岐メニュー更新 =====
    function updateBranchMenu(page) {
        if (!branchToggle || !branchMenu) return;

        branchMenu.innerHTML = "";
        if (page.children && page.children.length > 1) {
            branchToggle.classList.remove("hidden");
            page.children.forEach(child => {
                const link = document.createElement("a");
                link.href = `/page/${child.id}/viewer/`;
                link.className = "block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100";
                link.textContent = `${child.title} by ${child.author}（優先度: ${child.priority}）`;
                branchMenu.appendChild(link);
            });
        } else {
            branchToggle.classList.add("hidden");
        }
    }

    // ===== ボタン状態制御 =====
    function updateButtonStates() {
        const isFirst = currentIndex === 0;
        const isLast = currentIndex === pages.length - 1;

        [prevBtn, nextBtn].forEach((btn, i) => {
            const disabled = (i === 0 ? isFirst : isLast);
            btn.disabled = disabled;
            btn.style.pointerEvents = disabled ? "none" : "auto";
            btn.classList.toggle("opacity-40", disabled);
            btn.classList.toggle("hover:bg-gray-200", !disabled);
        });
    }

    // ===== ナビゲーション =====
    prevBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (currentIndex > 0) updateViewer(currentIndex - 1, "prev");
    });

    nextBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (currentIndex < pages.length - 1) updateViewer(currentIndex + 1, "next");
    });

    // ===== 分岐メニュー開閉 =====
    if (branchToggle && branchMenu) {
        branchToggle.addEventListener("click", () => {
            branchMenu.classList.toggle("hidden");
        });
        document.addEventListener("click", (e) => {
            if (!branchToggle.contains(e.target) && !branchMenu.contains(e.target)) {
                branchMenu.classList.add("hidden");
            }
        });
    }

    // ===== いいね処理 =====
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

    // ===== 初期化 =====
    updateViewer(currentIndex);
    updateButtonStates();

    // ===== ✅ スワイプ操作の追加 =====
    let touchStartX = 0;
    let touchEndX = 0;

    const swipeArea = document.querySelector(".relative.flex.items-center.justify-center"); // 画像＋矢印全体

    if (swipeArea) {
        swipeArea.addEventListener("touchstart", (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });

        swipeArea.addEventListener("touchend", (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });
    }

    function handleSwipe() {
        const diff = touchEndX - touchStartX;
        const threshold = 50; // スワイプとみなす最小距離(px)
        if (Math.abs(diff) < threshold) return;

        if (diff < 0 && !nextBtn.disabled) {
            nextBtn.click(); // 左→右
        } else if (diff > 0 && !prevBtn.disabled) {
            prevBtn.click(); // 右→左
        }
    }
});
