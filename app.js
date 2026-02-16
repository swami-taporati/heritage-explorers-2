/* ==========================================
   CONFIG & DATA
   ========================================== */
const GOOGLE_SCRIPT_URL = "YOUR_DEPLOYED_WEB_APP_URL";

const TEAM_CONFIG = {
    "Indian Roller": { pin: "4921", icon: "🐦" },
    "Asian Elephant": { pin: "8374", icon: "🐘" },
    "Lotus": { pin: "2569", icon: "🪷" },
    "Sandalwood": { pin: "7103", icon: "🪵" },
    "Mango": { pin: "6482", icon: "🥭" }
};

const QUEST_DATA = [
    { id: 1, loc: "Bannerghatta", code: "WILD26", task: "PHOTO: Capture a herbivore and a carnivore. QUIZ: Which animal is the state animal?", auto: 10 },
    { id: 2, loc: "Music Museum", code: "RAGA", task: "VIDEO: Record a 10s clip of a team member playing a traditional instrument.", auto: 0 },
    { id: 3, loc: "Hampi (Virupaksha)", code: "RAYA", task: "PHOTO: Find the 'Inverted Shadow'. QUIZ: Which empire ruled Hampi?", auto: 10 },
    { id: 4, loc: "Hampi (Vittala)", code: "CHARIOT", task: "PHOTO: Pose like the stone chariot. TASK: Count the musical pillars.", auto: 5 },
    { id: 5, loc: "JSW Kaladham", code: "STEEL", task: "PHOTO: Group selfie with the 3D Hampi exhibits.", auto: 0 },
    { id: 6, loc: "Chitradurga", code: "OBAVVA", task: "VIDEO: Re-enact Onake Obavva's story at the secret opening.", auto: 0 },
    { id: 7, loc: "Agumbe", code: "RAIN", task: "IDENTIFY: Find 3 medicinal plants with a farmer and list them.", auto: 10 },
    { id: 8, loc: "Sringeri", code: "SHARADA", task: "PHOTO: The zodiac pillars. QUIZ: Which river flows beside the temple?", auto: 10 },
    { id: 9, loc: "Bhoota Kola", code: "SPIRIT", task: "VIDEO: Record the ritual dance and describe the emotion in one word.", auto: 0 },
    { id: 10, loc: "Kambala", code: "BUFFALO", task: "PHOTO: Selfie with the track. QUIZ: Which animals are used in this race?", auto: 10 }
];

let currentTeam = localStorage.getItem('activeTeam') || null;
let selectedTeamTemp = "";
let tapCount = 0;

/* ==========================================
   INITIALIZATION
   ========================================== */
window.onload = () => {
    if (currentTeam) {
        showSection('dashboard');
        loadDashboard();
    }
    startSyncInterval();
};

/* ==========================================
   NAVIGATION & UI
   ========================================== */
function showSection(id) {
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.getElementById('main-nav').style.display = currentTeam ? 'flex' : 'none';
}

function prepLogin(teamName) {
    selectedTeamTemp = teamName;
    const config = TEAM_CONFIG[teamName];
    document.getElementById('modal-team-name').innerHTML = `${config.icon} Team ${teamName}`;
    document.getElementById('pin-modal').style.display = 'flex';
}

function hidePinEntry() {
    document.getElementById('pin-modal').style.display = 'none';
    document.getElementById('team-pin').value = "";
}

function login() {
    const pin = document.getElementById('team-pin').value;
    if (TEAM_CONFIG[selectedTeamTemp].pin === pin) {
        currentTeam = selectedTeamTemp;
        localStorage.setItem('activeTeam', currentTeam);
        hidePinEntry();
        showSection('dashboard');
        loadDashboard();
    } else {
        alert("🔒 Incorrect PIN!");
    }
}

function logout() {
    if(confirm("Logout? Progress is saved on this device.")) {
        localStorage.removeItem('activeTeam');
        location.reload();
    }
}

/* ==========================================
   GAME ENGINE
   ========================================== */
function loadDashboard() {
    const container = document.getElementById('quest-container');
    const completed = JSON.parse(localStorage.getItem('completedLevels') || "[]");
    const userIcon = TEAM_CONFIG[currentTeam].icon;
    
    document.getElementById('user-team-display').innerText = `${userIcon} Team ${currentTeam}`;
    container.innerHTML = "";

    QUEST_DATA.forEach((quest, index) => {
        const isDone = completed.includes(quest.id);
        const card = document.createElement('div');
        card.className = `quest-card ${isDone ? 'completed' : ''}`;
        card.innerHTML = `
            <h3>${quest.loc}</h3>
            ${isDone ? '<p class="status">✅ COMPLETED</p>' : `
                <input type="text" id="unlock-${quest.id}" placeholder="Enter Unlock Code">
                <button onclick="unlockQuest(${quest.id})">Unlock Challenge</button>
            `}
            <div id="task-${quest.id}" style="display:none;" class="task-box">
                <p>${quest.task}</p>
                <textarea id="content-${quest.id}" placeholder="Type your answer or 'Shown to Teacher'"></textarea>
                <button class="primary-btn" onclick="submitTask(${quest.id})">Finish & Sync</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function unlockQuest(id) {
    const input = document.getElementById(`unlock-${id}`).value.toUpperCase();
    const quest = QUEST_DATA.find(q => q.id === id);
    if (input === quest.code) {
        document.getElementById(`task-${id}`).style.display = 'block';
        document.getElementById(`unlock-${id}`).style.display = 'none';
    } else {
        alert("Wrong code! Search harder or ask the teacher.");
    }
}

async function submitTask(id) {
    const quest = QUEST_DATA.find(q => q.id === id);
    const content = document.getElementById(`content-${id}`).value;
    
    const payload = {
        team: currentTeam,
        location: quest.loc,
        taskType: "Quest",
        content: content,
        autoPoints: quest.auto
    };

    // Save locally immediately
    const completed = JSON.parse(localStorage.getItem('completedLevels') || "[]");
    completed.push(id);
    localStorage.setItem('completedLevels', JSON.stringify(completed));

    // Queue for sync
    addToSyncQueue(payload);
    alert("Saved! We will sync points when signal is found.");
    loadDashboard();
    checkFinalReveal(completed.length);
}

function checkFinalReveal(count) {
    if (count === QUEST_DATA.length) {
        alert("✨ LEGENDARY STATUS! ✨\nYour Final Clue Fragments combine to form:\n'The first key to the lost empire lies within the spirit of Karnataka.'");
    }
}

/* ==========================================
   SYNC & LEADERBOARD
   ========================================== */
function addToSyncQueue(payload) {
    let queue = JSON.parse(localStorage.getItem('syncQueue') || "[]");
    queue.push(payload);
    localStorage.setItem('syncQueue', JSON.stringify(queue));
    syncNow();
}

async function syncNow() {
    if (!navigator.onLine) return;
    
    let queue = JSON.parse(localStorage.getItem('syncQueue') || "[]");
    if (queue.length === 0) return;

    for (const item of queue) {
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(item)
            });
        } catch (e) { console.log("Sync failed, retrying later"); }
    }
    localStorage.setItem('syncQueue', "[]");
}

function startSyncInterval() {
    setInterval(syncNow, 30000); // Try sync every 30 seconds
}

async function fetchLeaderboard() {
    const tableBody = document.getElementById('leaderboard-body');
    const spinner = document.getElementById('loading-spinner');
    spinner.style.display = "block";
    tableBody.innerHTML = "";

    try {
        const res = await fetch(GOOGLE_SCRIPT_URL + "?action=getLeaderboard");
        const data = await res.json();
        spinner.style.display = "none";
        data.rankings.forEach((row, idx) => {
            const icon = TEAM_CONFIG[row.team] ? TEAM_CONFIG[row.team].icon : "🚩";
            tableBody.innerHTML += `<tr><td>${idx+1}</td><td>${icon} ${row.team}</td><td>${row.points}</td></tr>`;
        });
    } catch (e) {
        spinner.innerText = "Check back once you have signal!";
    }
}

/* ==========================================
   TEACHER ADMIN
   ========================================== */
function handleAdminTap() {
    tapCount++;
    if (tapCount === 3) {
        const pass = prompt("Admin Password:");
        if (pass === "KARNATAKA2026") {
            showSection('admin-panel');
        }
        tapCount = 0;
    }
}

function resetAllTeams() {
    if(confirm("⚠️ WIPE ALL DATA? This cannot be undone.")) {
        localStorage.clear();
        location.reload();
    }
}

function closeAdmin() {
    showSection(currentTeam ? 'dashboard' : 'login-screen');
}
