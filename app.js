const TEAM_PINS = { "Indian Roller": "1234", "Asian Elephant": "5678", "Lotus": "1111", "Sandalwood": "2222", "Mango": "3333" };
let currentTeam = localStorage.getItem('activeTeam') || null;
const QUEST_DATA = [
    { day: 2, loc: "Bannerghatta", code: "WILD26", task: "PHOTO: Capture a herbivore and a carnivore (safari). QUIZ: Which animal is the state animal of Karnataka?", type: "Mixed", auto: 10 },
    { day: 2, loc: "Music Museum", code: "RAGA", task: "VIDEO: Record a 10-second clip of a team member trying a traditional instrument.", type: "Video", auto: 0 },
    { day: 3, loc: "Hampi (Virupaksha)", code: "RAYA", task: "PHOTO: Find the 'Inverted Shadow' of the temple tower. QUIZ: Which empire ruled from here?", type: "Mixed", auto: 10 },
    { day: 4, loc: "Hampi (Vittala)", code: "CHARIOT", task: "PHOTO: Pose like the stone chariot behind you. TASK: Count the number of pillars in the musical hall.", type: "Photo", auto: 5 },
    { day: 4, loc: "JSW Kaladham", code: "STEEL", task: "PHOTO: Take a creative group photo with the 3D Hampi exhibits.", type: "Photo", auto: 0 },
    { day: 6, loc: "Chitradurga", code: "OBAVVA", task: "VIDEO: Re-enact the story of Onake Obavva at the 'Kalla Kindi' (secret opening).", type: "Video", auto: 0 },
    { day: 7, loc: "Agumbe", code: "RAIN", task: "IDENTIFY: Find 3 types of medicinal plants with the help of a farmer and list them.", type: "Text", auto: 10 },
    { day: 8, loc: "Sringeri", code: "SHARADA", task: "QUIZ: Name the river flowing beside the temple. PHOTO: The zodiac pillars (Rashistambhas).", type: "Mixed", auto: 10 },
    { day: 8, loc: "Bhoota Kola", code: "SPIRIT", task: "VIDEO: Record a short clip of the ritual dance and describe the emotion in one word.", type: "Video", auto: 0 },
    { day: 9, loc: "Kambala", code: "BUFFALO", task: "PHOTO: A selfie with the racing track in the background. QUIZ: What are the animals used in this race?", type: "Mixed", auto: 10 }
];

function addDynamicQuest() {
    const newLoc = prompt("Enter New Location (e.g., Udupi):");
    const newCode = prompt("Set Unlock Code:");
    const newTask = prompt("Enter the Challenge Description:");

    if (newLoc && newCode && newTask) {
        QUEST_DATA.push({
            day: "Extra",
            loc: newLoc,
            code: newCode.toUpperCase(),
            task: newTask,
            type: "Dynamic",
            auto: 0
        });
        alert("Challenge Added! Give the code " + newCode + " to students when ready.");
        loadDashboard(); // Refresh the list
    }
}

function checkFinalReveal() {
    const completed = JSON.parse(localStorage.getItem('completedLevels') || "[]");
    if (completed.length === QUEST_DATA.length) {
        alert("✨ GRAND REVEAL UNLOCKED! ✨\nYour Clue Pieces: 'The first key to the lost empire lies within the spirit of Karnataka.'");
        // You could also redirect to a special 'Winner' page
    }
}


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
