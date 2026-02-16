const TEAM_PINS = { "Indian Roller": "1234", "Asian Elephant": "5678", "Lotus": "1111", "Sandalwood": "2222", "Mango": "3333" };
let currentTeam = localStorage.getItem('activeTeam') || null;

// Offline Save Logic
function saveProgress(data) {
    localStorage.setItem('heritage_save', JSON.stringify(data));
    // Try to sync to Google Sheets if online
    if (navigator.onLine) { syncToGoogleSheets(data); }
}

function login() {
    const pin = document.getElementById('team-pin').value;
    const selectedTeam = window.pendingTeam;
    if (TEAM_PINS[selectedTeam] === pin) {
        currentTeam = selectedTeam;
        localStorage.setItem('activeTeam', selectedTeam);
        loadDashboard();
    } else {
        alert("Wrong PIN!");
    }
}

// Teacher Admin Hidden Trigger
let tapCount = 0;
function handleAdminTap(e) {
    tapCount++;
    if (tapCount === 3) {
        const pass = prompt("Enter Admin Password:");
        if (pass === "KARNATAKA2026") {
            document.getElementById('admin-panel').style.display = 'block';
            document.getElementById('login-screen').style.display = 'none';
        }
        tapCount = 0;
    }
}

function resetAllTeams() {
    if(confirm("This will wipe all scores and progress. Continue?")) {
        localStorage.clear();
        location.reload();
    }
}
