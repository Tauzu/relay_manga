document.addEventListener("DOMContentLoaded", () => {
    const title = document.getElementById("viewer-title");
    const idSpan = document.getElementById("viewer-id");
    const likeForm = document.getElementById("like-form");
    const likeButton = document.getElementById("like-button");
    const likeCount = document.getElementById("like-count");
    const branchToggle = document.getElementById("branch-toggle");
    const branchMenu = document.getElementById("branch-menu");
    const continueLink = document.getElementById("continue-link");

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
        idSpan.textContent = page.id;
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

        updateBranchMenu(page);
        currentIndex = newIndex;
    }

    /* 🟦 分岐メニュー */
    function updateBranchMenu(page) {
        branchMenu.innerHTML = "";
        if (page.children && page.children.length > 1) {
            branchToggle.classList.remove("hidden");
            page.children.forEach((child) => {
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

    /* 🟦 Splide が移動したらページ情報を同期 */
    splide.on("moved", (newIndex) => {
        updateViewer(newIndex);
    });

    splide.mount();

    /* 初期表示 */
    updateViewer(currentIndex);

    /* うぃーね処理（変更なし） */
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

    /* 分岐メニュー開閉 */
    branchToggle.addEventListener("click", () => {
        branchMenu.classList.toggle("hidden");
    });
    document.addEventListener("click", (e) => {
        if (!branchToggle.contains(e.target) && !branchMenu.contains(e.target)) {
            branchMenu.classList.add("hidden");
        }
    });
});
