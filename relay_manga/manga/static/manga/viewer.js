document.addEventListener("DOMContentLoaded", () => {
    const data = window.viewerData.pages;
    const csrfToken = window.viewerData.csrfToken;

    let index = 0;
    const imageEl = document.getElementById("viewer-image");
    const titleEl = document.getElementById("viewer-title");
    const likeCount = document.getElementById("like-count");
    const likeButton = document.getElementById("like-button");
    const form = document.getElementById("like-form");

    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");

    function updateViewer() {
        const page = data[index];
        imageEl.style.opacity = 0;
        setTimeout(() => {
        imageEl.src = page.image;
        titleEl.innerHTML = `
            <span class="text-black hover:underline cursor-pointer" 
                onclick="window.location.href='${page.manga_url}'">
            ${page.manga_title}
            </span>
            > ${page.title} (ID: ${page.id})
        `;
        likeCount.textContent = page.likes;
        form.action = page.like_url;
        imageEl.style.opacity = 1;
        }, 200);

        prevBtn.disabled = index === 0;
        nextBtn.disabled = index === data.length - 1;
    }

    // いいね
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        fetch(form.action, {
        method: "POST",
        headers: {
            "X-CSRFToken": csrfToken,
            "X-Requested-With": "XMLHttpRequest"
        }
        })
        .then(res => res.json())
        .then(json => {
            likeCount.textContent = json.likes;
            likeButton.disabled = true;
            likeButton.textContent = "👍 いいね済み";
        });
    });

    // スライド
    prevBtn.addEventListener("click", () => {
        if (index > 0) {
        index--;
        updateViewer();
        }
    });
    nextBtn.addEventListener("click", () => {
        if (index < data.length - 1) {
        index++;
        updateViewer();
        }
    });

    // 初期表示
    updateViewer();
});
