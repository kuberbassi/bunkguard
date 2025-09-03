// --- Tab Management ---
function openSem(sem, element) {
    document.querySelectorAll(".tabcontent").forEach(el => el.style.display = "none");
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    document.getElementById("sem-" + sem).style.display = "block";
    element.classList.add("active");
}

// --- Page Load Logic ---
document.addEventListener("DOMContentLoaded", () => {
    // Activate the first tab that has content
    const firstBtn = document.querySelector(".tab-btn");
    if (firstBtn) {
        firstBtn.click();
    }

    // Initialize Drag-and-Drop on all visible tables
    document.querySelectorAll('tbody').forEach(tbody => {
        if (tbody.children.length > 0) {
            new Sortable(tbody, {
                handle: '.drag-handle',
                animation: 150,
                onEnd: function () {
                    const subject_ids = Array.from(tbody.children).map(row => row.dataset.id);
                    fetch('/api/reorder', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ subject_ids: subject_ids })
                    });
                }
            });
        }
    });
});

// --- API Call Functions ---

// Helper function to handle API responses by reloading the page
async function handleApiResponse(response) {
    if (response.ok) {
        window.location.reload();
    } else {
        const result = await response.json();
        alert(`Error: ${result.message || 'An unknown error occurred.'}`);
    }
}

async function undoAction() {
    const response = await fetch("/api/undo", { method: "POST" });
    handleApiResponse(response);
}

async function redoAction() {
    const response = await fetch("/api/redo", { method: "POST" });
    handleApiResponse(response);
}

async function markAttendance(sem, subject, status) {
    const response = await fetch("/api/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sem, subject, status })
    });
    handleApiResponse(response);
}

async function addSubject(event, sem) {
    event.preventDefault();
    const input = document.getElementById(`subject-input-${sem}`);
    const subject = input.value.trim();
    if (!subject) return;

    const response = await fetch("/api/add_subject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sem, subject })
    });
    handleApiResponse(response);
}

async function deleteSubject(sem, subject) {
    if (confirm(`Are you sure you want to delete ${subject}? This cannot be undone.`)) {
        const response = await fetch("/api/delete_subject", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sem, subject })
        });
        handleApiResponse(response);
    }
}