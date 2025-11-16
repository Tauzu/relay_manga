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
    function updateViewer(newIndex) {
        if (newIndex < 0 || newIndex >= pages.length) return;

        const newPage = pages[newIndex];

        // ✅ 即座に画像・タイトルなどを切り替える
        image.src = newPage.image;
        title.textContent = newPage.title;
        idSpan.textContent = newPage.id;
        likeCount.textContent = newPage.likes;
        likeForm.action = newPage.like_url;

        // ✅ 続きを描くリンク更新
        const continueLink = document.getElementById("continue-link");
        if (continueLink) {
            continueLink.href = `/page/${newPage.id}/continue/`;
        }

        // ✅ ページカウンター更新
        const counter = document.getElementById("page-counter");
        if (counter) counter.textContent = `${newIndex + 1} / ${pages.length}`;

        // うぃーねボタン状態更新
        const storageKey = `liked_page_${newPage.id}`;

        if (localStorage.getItem(storageKey)) {
            likeButton.disabled = true;
            likeButton.textContent = "👍 うぃーね済み";
        } else {
            likeButton.disabled = false;
            likeButton.textContent = "👍 うぃーね";
        }

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

    // ===== うぃーね処理（ログイン不要＋localStorage） =====
    likeForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const currentPage = pages[currentIndex];
        const storageKey = `liked_page_${currentPage.id}`;

        // すでにうぃーね済みなら何もしない
        if (localStorage.getItem(storageKey)) {
            return;
        }

        fetch(this.action, {
            method: "POST",
            headers: {
                "X-CSRFToken": this.querySelector("[name=csrfmiddlewaretoken]").value,
                "X-Requested-With": "XMLHttpRequest",
            },
        })
        .then((res) => res.json())
        .then((data) => {
            // サーバーが問題なく処理した
            likeCount.textContent = data.likes;

            // localStorage に保存（ログイン不要）
            localStorage.setItem(storageKey, "1");

            // うぃーね済みに UI を更新
            likeButton.disabled = true;
            likeButton.textContent = "👍 うぃーね済み";
        })
        .catch(err => {
            console.error("うぃーね通信エラー:", err);
        });
    });

    // ===== 初期化 =====
    updateViewer(currentIndex);
    updateButtonStates();

    // ===== ✅ スワイプ操作（完全同期修正版） =====
    let touchStartX = 0;
    let isSwiping = false;

    const swipeArea = document.querySelector(".relative.flex.items-center.justify-center");
    const transitionDuration = 350;
    const threshold = 60;

    if (swipeArea && image) {
        swipeArea.addEventListener("touchstart", (e) => {
            touchStartX = e.touches[0].clientX;
            isSwiping = true;
            image.style.transition = "none";
        });

        swipeArea.addEventListener("touchmove", (e) => {
            if (!isSwiping) return;
            const deltaX = e.touches[0].clientX - touchStartX;
            image.style.transform = `translateX(${deltaX}px)`;
            image.style.opacity = `${1 - Math.min(Math.abs(deltaX) / 200, 0.4)}`;
        });

        swipeArea.addEventListener("touchend", (e) => {
            if (!isSwiping) return;
            isSwiping = false;

            const deltaX = e.changedTouches[0].clientX - touchStartX;
            const goNext = deltaX < -threshold && !nextBtn.disabled;
            const goPrev = deltaX > threshold && !prevBtn.disabled;

            image.style.transition = `transform ${transitionDuration}ms ease, opacity ${transitionDuration}ms ease`;

            // 左スワイプ → 次ページへ
            if (goNext) {
                image.style.transform = "translateX(-100%)";
                image.style.opacity = "0";
                setTimeout(() => {
                    updateViewer(currentIndex + 1, "next");
                    image.style.transition = "none";
                    image.style.transform = "translateX(100%)";
                    image.style.opacity = "0";
                    requestAnimationFrame(() => {
                        image.style.transition = `transform ${transitionDuration}ms ease, opacity ${transitionDuration}ms ease`;
                        image.style.transform = "translateX(0)";
                        image.style.opacity = "1";
                    });
                }, transitionDuration);
            }

            // 右スワイプ → 前ページへ
            else if (goPrev) {
                image.style.transform = "translateX(100%)";
                image.style.opacity = "0";
                setTimeout(() => {
                    updateViewer(currentIndex - 1, "prev");
                    image.style.transition = "none";
                    image.style.transform = "translateX(-100%)";
                    image.style.opacity = "0";
                    requestAnimationFrame(() => {
                        image.style.transition = `transform ${transitionDuration}ms ease, opacity ${transitionDuration}ms ease`;
                        image.style.transform = "translateX(0)";
                        image.style.opacity = "1";
                    });
                }, transitionDuration);
            }

            // スワイプ距離が足りない場合は元に戻す
            else {
                image.style.transform = "translateX(0)";
                image.style.opacity = "1";
            }
        });
    }
});
