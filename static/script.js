let questions = [];
let currentQuestion = null;
let solvedSet = new Set(JSON.parse(localStorage.getItem("ml_solved") || "[]"));
let activeFilter = "all";

async function init() {
    const res = await fetch("/api/questions");
    questions = await res.json();
    renderSidebar();
    updateProgress();

    document.getElementById("search-box").addEventListener("input", renderSidebar);
    document.getElementById("btn-check").addEventListener("click", checkAnswer);
    document.getElementById("btn-reveal").addEventListener("click", revealAnswer);
    document.getElementById("btn-reset").addEventListener("click", resetBlanks);

    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeFilter = btn.dataset.difficulty;
            renderSidebar();
        });
    });
}

function renderSidebar() {
    const search = document.getElementById("search-box").value.toLowerCase();
    const list = document.getElementById("question-list");
    list.innerHTML = "";

    let currentTopic = null;

    const filtered = questions.filter(q => {
        const matchSearch = q.title.toLowerCase().includes(search) ||
                            q.topic.toLowerCase().includes(search);
        const matchDiff = activeFilter === "all" || q.difficulty === activeFilter;
        return matchSearch && matchDiff;
    });

    filtered.forEach(q => {
        if (q.topic !== currentTopic) {
            currentTopic = q.topic;
            const header = document.createElement("div");
            header.style.cssText = "font-size:0.7rem;color:#8b949e;padding:12px 12px 4px;text-transform:uppercase;letter-spacing:1px;";
            header.textContent = currentTopic;
            list.appendChild(header);
        }

        const item = document.createElement("div");
        item.className = "q-item" +
            (solvedSet.has(q.id) ? " solved" : "") +
            (currentQuestion && currentQuestion.id === q.id ? " active" : "");
        item.innerHTML = `
            <span class="status-dot"></span>
            <span>${q.title}</span>
            <span class="diff-tag diff-${q.difficulty}">${q.difficulty}</span>
        `;
        item.addEventListener("click", () => selectQuestion(q));
        list.appendChild(item);
    });
}

function selectQuestion(q) {
    currentQuestion = q;
    document.getElementById("welcome").classList.add("hidden");
    document.getElementById("question-view").classList.remove("hidden");
    document.getElementById("feedback").classList.add("hidden");

    document.getElementById("q-topic").textContent = q.topic;
    const diffBadge = document.getElementById("q-difficulty");
    diffBadge.textContent = q.difficulty;
    diffBadge.className = "difficulty-badge diff-" + q.difficulty;
    document.getElementById("q-title").textContent = q.title;
    document.getElementById("q-description").textContent = q.description;

    // Info panel
    const infoPanel = document.getElementById("info-panel");
    const infoToggle = document.getElementById("info-toggle");
    const infoContent = document.getElementById("info-content");
    if (q.info) {
        infoPanel.classList.remove("hidden");
        infoContent.classList.add("hidden");
        infoToggle.classList.remove("open");
        infoToggle.textContent = "Show Concept Info";
        infoContent.textContent = q.info;
        infoToggle.onclick = () => {
            const isOpen = !infoContent.classList.contains("hidden");
            if (isOpen) {
                infoContent.classList.add("hidden");
                infoToggle.classList.remove("open");
                infoToggle.textContent = "Show Concept Info";
            } else {
                infoContent.classList.remove("hidden");
                infoToggle.classList.add("open");
                infoToggle.textContent = "Hide Concept Info";
            }
        };
    } else {
        infoPanel.classList.add("hidden");
    }

    renderCode(q);
    renderSidebar();
}

function renderCode(q) {
    const container = document.getElementById("code-container");
    // Split code on blank placeholders like {{blank_id}}
    const parts = q.code.split(/(\{\{[^}]+\}\})/g);
    container.innerHTML = "";

    parts.forEach(part => {
        const match = part.match(/^\{\{([^}]+)\}\}$/);
        if (match) {
            const blankId = match[1];
            const blankInfo = q.blanks.find(b => b.id === blankId);
            const input = document.createElement("input");
            input.type = "text";
            input.className = "blank-input";
            input.dataset.blankId = blankId;
            input.placeholder = blankInfo ? blankInfo.placeholder : "___";
            // Auto-size based on placeholder
            input.style.width = Math.max(120, (input.placeholder.length + 2) * 9) + "px";
            input.addEventListener("input", () => {
                input.style.width = Math.max(120, (input.value.length + 2) * 9) + "px";
                input.classList.remove("correct", "incorrect", "revealed");
            });
            container.appendChild(input);
        } else {
            const span = document.createElement("span");
            span.textContent = part;
            container.appendChild(span);
        }
    });
}

async function checkAnswer() {
    if (!currentQuestion) return;

    const inputs = document.querySelectorAll(".blank-input");
    const answers = {};
    inputs.forEach(input => {
        answers[input.dataset.blankId] = input.value;
    });

    const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            question_id: currentQuestion.id,
            answers: answers,
        }),
    });

    const result = await res.json();
    const feedback = document.getElementById("feedback");
    feedback.classList.remove("hidden", "success", "error", "revealed");

    if (result.all_correct) {
        feedback.classList.add("success");
        feedback.innerHTML = "Correct! Well done.";
        solvedSet.add(currentQuestion.id);
        localStorage.setItem("ml_solved", JSON.stringify([...solvedSet]));
        updateProgress();
    } else {
        feedback.classList.add("error");
        let hints = [];
        for (const [blankId, r] of Object.entries(result.results)) {
            const input = document.querySelector(`[data-blank-id="${blankId}"]`);
            if (r.correct) {
                input.classList.add("correct");
                input.classList.remove("incorrect");
            } else {
                input.classList.add("incorrect");
                input.classList.remove("correct");
                if (r.hint) {
                    hints.push(`<span class="hint">${r.hint}</span>`);
                }
            }
        }
        feedback.innerHTML = "Not quite. Check the highlighted blanks." +
            (hints.length ? "<br>" + hints.join("<br>") : "");
    }

    renderSidebar();
}

async function revealAnswer() {
    if (!currentQuestion) return;

    const res = await fetch("/api/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: currentQuestion.id }),
    });

    const result = await res.json();
    const feedback = document.getElementById("feedback");
    feedback.classList.remove("hidden", "success", "error");
    feedback.classList.add("revealed");
    feedback.innerHTML = "Answer revealed. Try to understand it, then reset and try again!";

    for (const [blankId, answer] of Object.entries(result.answers)) {
        const input = document.querySelector(`[data-blank-id="${blankId}"]`);
        if (input) {
            input.value = answer;
            input.style.width = Math.max(120, (answer.length + 2) * 9) + "px";
            input.classList.remove("correct", "incorrect");
            input.classList.add("revealed");
        }
    }
}

function resetBlanks() {
    document.querySelectorAll(".blank-input").forEach(input => {
        input.value = "";
        input.classList.remove("correct", "incorrect", "revealed");
    });
    document.getElementById("feedback").classList.add("hidden");
}

function updateProgress() {
    const total = questions.length;
    const solved = solvedSet.size;
    const pct = total > 0 ? (solved / total) * 100 : 0;
    document.getElementById("progress-fill").style.width = pct + "%";
    document.getElementById("progress-text").textContent = `${solved} / ${total} solved`;
}

document.addEventListener("DOMContentLoaded", init);
