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

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwus5oJWiCpHM-lODpl2Ttleq2vNb7ZPEnxeBYMgQ2NB6lc15at8NysJrE3ZLCq01NN/exec";

async function fetchLeaderboard() {
    const tableBody = document.getElementById('leaderboard-body');
    const spinner = document.getElementById('loading-spinner');
    
    spinner.style.display = "block";
    tableBody.innerHTML = "";

    try {
        // We add a 'getLeaderboard' parameter to our URL
        const response = await fetch(GOOGLE_SCRIPT_URL + "?action=getLeaderboard");
        const data = await response.json();
        
        spinner.style.display = "none";
        
        data.rankings.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${getTeamIcon(row.team)} ${row.team}</td>
                <td><strong>${row.points}</strong></td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        spinner.innerText = "Leaderboard currently offline. Check back later!";
    }
}

function getTeamIcon(name) {
    const icons = { "Indian Roller": "🐦", "Asian Elephant": "🐘", "Lotus": "🪷", "Sandalwood": "🪵", "Mango": "🥭" };
    return icons[name] || "🚩";
}

function showSection(id) {
    document.querySelectorAll('.page-section, #login-screen').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}
function submitToTeacher(payload) {
    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Important for cross-domain
        cache: 'no-cache',
        body: JSON.stringify(payload)
    }).then(() => {
        alert("Sent to teacher for approval! Keep exploring.");
    }).catch(err => {
        // If offline, save to a 'pending' list in LocalStorage to sync later
        saveOffline(payload);
    });
}
function resetAllTeams() {
    if(confirm("This will wipe all scores and progress. Continue?")) {
        localStorage.clear();
        location.reload();
    }
}
