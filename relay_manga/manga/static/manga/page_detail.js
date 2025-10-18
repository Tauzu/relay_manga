// ❤️ いいね処理
const likeForm = document.getElementById("like-form");
if (likeForm) {
    likeForm.addEventListener("submit", function (event) {
        event.preventDefault();
        fetch(this.action, {
            method: "POST",
            headers: {
                "X-CSRFToken": this.querySelector("[name=csrfmiddlewaretoken]").value,
                "X-Requested-With": "XMLHttpRequest"
            }
        })
        .then(response => {
            if (response.redirected) {
                alert("いいねするにはログインが必要です。");
                window.location.href = response.url;
                return;
            }
            return response.json();
        })
        .then(data => {
            if (!data) return;
            document.getElementById("like-count").innerText = data.likes;
            if (data.already) {
                const btn = document.getElementById("like-button");
                btn.disabled = true;
                btn.textContent = "👍 いいね済み";
            }
        });
    });
}

// 🌿 分岐ボタン制御
const toggle = document.getElementById("branch-toggle");
const menu = document.getElementById("branch-menu");
if (toggle && menu) {
    toggle.addEventListener("click", () => {
        menu.classList.toggle("hidden");
    });
    document.addEventListener("click", (e) => {
        if (!toggle.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.add("hidden");
        }
    });
}
