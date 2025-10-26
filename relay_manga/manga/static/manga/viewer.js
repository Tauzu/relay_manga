document.addEventListener("DOMContentLoaded", () => {
    const image = document.getElementById("viewer-image");
    const title = document.getElementById("viewer-title");
    const idSpan = document.getElementById("viewer-id");
    const likeForm = document.getElementById("like-form");
    const likeButton = document.getElementById("like-button");
    const likeCount = document.getElementById("like-count");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");

    let currentIndex = 0;

    // ✅ ページ切り替え処理
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

        image.classList.remove("opacity-0", "translate-x-10", "-translate-x-10");
        image.classList.add("opacity-100");
        }, 250);

        // ボタン状態更新
        currentIndex = newIndex;
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === pages.length - 1;
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
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === pages.length - 1;
});
