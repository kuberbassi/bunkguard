// --- Tab Management ---
function openSem(sem, element) {
    document.querySelectorAll(".tabcontent").forEach(el => el.style.display = "none");
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    document.getElementById("sem-" + sem).style.display = "block";
    element.classList.add("active");
}
document.addEventListener("DOMContentLoaded", () => {
    const firstBtn = document.querySelector(".tab-btn");
    if (firstBtn) firstBtn.click();
});

// --- Helper Functions ---
function updateSummaryBox(sem, summary) {
    const summaryBox = document.querySelector(`#summary-${sem}`);
    if (summaryBox) {
        summaryBox.querySelector('.total').textContent = summary.total;
        summaryBox.querySelector('.attended').textContent = summary.attended;
        summaryBox.querySelector('.absent').textContent = summary.absent;
        summaryBox.querySelector('.percent').textContent = summary.percent + "%";
    }
}
function updateRowAndSummary(sem, data) {
    const row = document.querySelector(`#row-${sem}-${data.subject}`);
    if (row) {
        const percentCell = row.querySelector(".percent");
        row.querySelector(".attended").textContent = data.attended;
        row.querySelector(".total").textContent = data.total;
        percentCell.innerHTML = `<span>${data.percent}%</span>`;
        if (data.percent < 75 && data.recovery_needed > 0) {
            percentCell.classList.add("low-attendance");
            percentCell.innerHTML += `<div class="recovery-note"><i class="fa-solid fa-arrow-trend-up"></i> Attend next ${data.recovery_needed} classes</div>`;
        } else {
            percentCell.classList.remove("low-attendance");
        }
    }
    updateSummaryBox(sem, data.summary);
}

// --- API Call Functions ---
async function addSubject(event, sem) {
    event.preventDefault();
    const input = document.getElementById(`subject-input-${sem}`);
    const subject = input.value.trim();
    if (!subject) return;

    const response = await fetch("/api/add_subject", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sem, subject })
    });
    const data = await response.json();
    if (data.success) {
        const tbody = document.getElementById(`tbody-${sem}`);
        const newRow = document.createElement('tr');
        newRow.id = `row-${sem}-${data.subject}`;
        newRow.innerHTML = `
            <td data-label="Subject">${data.subject}</td>
            <td data-label="Present" class="attended">0</td>
            <td data-label="Total" class="total">0</td>
            <td data-label="Percentage" class="percent"><span>0%</span></td>
            <td data-label="Actions">
                <button class="btn btn-present" title="Mark Present" onclick="markAttendance('${sem}', '${data.subject}', 'p')"><i class="fa-solid fa-check"></i></button>
                <button class="btn btn-absent" title="Mark Absent" onclick="markAttendance('${sem}', '${data.subject}', 'a')"><i class="fa-solid fa-xmark"></i></button>
                <button class="btn btn-undo-subject" title="Undo last mark" onclick="undoSubjectAction('${sem}', '${data.subject}')"><i class="fa-solid fa-reply"></i></button>
                <button class="btn btn-delete" title="Delete Subject" onclick="deleteSubject('${sem}', '${data.subject}')"><i class="fa-solid fa-trash"></i></button>
            </td>`;
        tbody.appendChild(newRow);
        updateSummaryBox(sem, data.summary);
        input.value = "";
    }
}

async function undoSubjectAction(sem, subject) {
    const response = await fetch('/api/undo_subject', {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sem, subject })
    });
    const data = await response.json();
    if (data.success) {
        updateRowAndSummary(sem, data);
    } else {
        alert(data.message);
    }
}

async function markAttendance(sem, subject, status) {
    const response = await fetch("/api/mark", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sem, subject, status })
    });
    const data = await response.json();
    data.subject = subject;
    updateRowAndSummary(sem, data);
}

async function redoAction() {
    const response = await fetch('/api/redo', { method: "POST" });
    const data = await response.json();
    if (data.success) {
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            const sem = activeTab.textContent.split(' ')[1];
            updateRowAndSummary(sem, data);
        }
    } else {
        alert(data.message);
    }
}

async function deleteSubject(sem, subject) {
    if (confirm(`Are you sure you want to delete ${subject}? This cannot be undone.`)) {
        const response = await fetch("/api/delete_subject", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sem, subject })
        });
        const data = await response.json();
        if (data.success) {
            document.querySelector(`#row-${sem}-${subject}`).remove();
            updateSummaryBox(sem, data.summary);
        }
    }
}