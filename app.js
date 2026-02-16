const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwus5oJWiCpHM-lODpl2Ttleq2vNb7ZPEnxeBYMgQ2NB6lc15at8NysJrE3ZLCq01NN/exec";

const TEAM_CONFIG = {
    "Indian Roller": { pin: "4921", icon: '<img src="images/roller.png">' },
    "Asian Elephant": { pin: "8374", icon: '<img src="images/elephant.png">' },
    "Lotus": { pin: "2569", icon: '<img src="images/lotus.png">' },
    "Sandalwood": { pin: "7103", icon: '<img src="images/sandalwood.png">' },
    "Mango": { pin: "6482", icon: '<img src="images/mango.png">' }
};

const QUEST_DATA = [
    { id: 1, loc: "Bannerghatta", code: "WILD26", task: "PHOTO: Capture a herbivore and a carnivore (safari).", quiz: { q: "Which animal is the state animal of Karnataka?", o: ["Bengal Tiger", "Asian Elephant", "Indian Roller", "Leopard"], a: 1 }, auto: 10 },
    { id: 2, loc: "Music Museum", code: "RAGA", task: "VIDEO: Record a clip of a team member trying an instrument.", quiz: { q: "Which instrument is famously seen in the museum?", o: ["Veena", "Flute", "Tabla", "Drums"], a: 0 }, auto: 10 },
    { id: 3, loc: "Hampi (Virupaksha)", code: "RAYA", task: "PHOTO: Find the 'Inverted Shadow' of the gopuram.", quiz: { q: "Hampi was capital of which empire?", o: ["Mughal", "Vijayanagara", "Chola", "Maratha"], a: 1 }, auto: 10 },
    { id: 4, loc: "Hampi (Vittala)", code: "CHARIOT", task: "PHOTO: Group pose at the Stone Chariot.", quiz: { q: "What's unique about the Vittala pillars?", o: ["Made of gold", "They sing", "100ft tall", "Moving"], a: 1 }, auto: 10 },
    { id: 5, loc: "JSW Kaladham", code: "STEEL", task: "PHOTO: Creative selfie with 3D Hampi exhibits.", quiz: { q: "What does JSW Vidyanagar produce?", o: ["Silk", "Coffee", "Steel", "Cotton"], a: 2 }, auto: 10 },
    { id: 6, loc: "Chitradurga", code: "OBAVVA", task: "VIDEO: Explain the legend of Obavva at the 'secret opening'.", quiz: { q: "How many walls (Saptapadi) does the fort have?", o: ["3", "5", "7", "9"], a: 2 }, auto: 10 },
    { id: 7, loc: "Agumbe", code: "RAIN", task: "IDENTIFY: Name a medicinal plant used by local farmers.", quiz: { q: "Agumbe is the ____ of South India.", o: ["Ooty", "Cherrapunji", "Kashmir", "Mysuru"], a: 1 }, auto: 10 },
    { id: 8, loc: "Sringeri", code: "SHARADA", task: "PHOTO: The zodiac pillars (Rashistambhas).", quiz: { q: "Which river flows beside the temple?", o: ["Tunga", "Kaveri", "Krishna", "Ganga"], a: 0 }, auto: 10 },
    { id: 9, loc: "Kambala", code: "BUFFALO", task: "PHOTO/VIDEO: Re-enact the racing posture.", quiz: { q: "Kambala involves racing which animal?", o: ["Horses", "Bulls", "Buffaloes", "Camels"], a: 2 }, auto: 10 }
];

let currentTeam = localStorage.getItem('activeTeam') || null;
let selectedTeamTemp = "";

// Initialize
window.onload = () => { 
    if (currentTeam) { 
        showSection('dashboard'); 
        loadDashboard(); 
        updateMyTeamScore();
    } 
};

function showSection(id) {
    document.querySelectorAll('.page-section, #login-screen').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.getElementById('main-nav').style.display = currentTeam ? 'flex' : 'none';
}

// LOGIN LOGIC
function prepLogin(team) { selectedTeamTemp = team; document.getElementById('modal-team-name').innerText = "Team " + team; document.getElementById('pin-modal').style.display = 'flex'; }
function hidePinEntry() { document.getElementById('pin-modal').style.display = 'none'; document.getElementById('team-pin').value = ""; }

function login() {
    const pin = document.getElementById('team-pin').value;
    if (TEAM_CONFIG[selectedTeamTemp].pin === pin) {
        currentTeam = selectedTeamTemp;
        localStorage.setItem('activeTeam', currentTeam);
        location.reload();
    } else { alert("Incorrect PIN!"); }
}

function logout() { localStorage.removeItem('activeTeam'); location.reload(); }

// GAMEPLAY
function loadDashboard() {
    const container = document.getElementById('quest-container');
    const completed = JSON.parse(localStorage.getItem('completedLevels') || "[]");
    document.getElementById('user-team-display').innerHTML = `${TEAM_CONFIG[currentTeam].icon} <span>${currentTeam}</span>`;
    container.innerHTML = "";

    QUEST_DATA.forEach(q => {
        const isDone = completed.includes(q.id);
        const card = document.createElement('div');
        card.className = "quest-card";
        card.innerHTML = isDone ? `<h3>${q.loc}</h3><p style="color:#2e7d32;font-weight:bold;">✅ CHALLENGE COMPLETE</p>` : `
            <h3>${q.loc}</h3>
            <div id="lock-${q.id}">
                <input type="text" id="code-${q.id}" placeholder="Unlock Code" class="media-input">
                <button class="primary-btn" onclick="unlock(${q.id})">Unlock Site</button>
            </div>
            <div id="task-${q.id}" style="display:none;" class="task-area">
                <p><strong>📸 Task:</strong> ${q.task}</p>
                <input type="text" id="media-${q.id}" placeholder="Photo Link or 'Shown to Teacher'" class="media-input">
                <hr>
                <p><strong>🧠 Quiz:</strong> ${q.quiz.q}</p>
                ${q.quiz.o.map((opt, i) => `<label class="quiz-opt"><input type="radio" name="q-${q.id}" value="${i}"> ${opt}</label>`).join('')}
                <button class="submit-btn" onclick="submit(${q.id})">Submit & Sync Points</button>
            </div>`;
        container.appendChild(card);
    });
}

function unlock(id) {
    const code = document.getElementById(`code-${id}`).value.toUpperCase();
    if (code === QUEST_DATA.find(q => q.id === id).code) {
        document.getElementById(`task-${id}`).style.display = "block";
        document.getElementById(`lock-${id}`).style.display = "none";
    } else { alert("Wrong code!"); }
}

async function submit(id) {
    const quest = QUEST_DATA.find(q => q.id === id);
    const selected = document.querySelector(`input[name="q-${id}"]:checked`);
    const media = document.getElementById(`media-${id}`).value;

    if (!selected) return alert("Please answer the quiz!");
    if (!media) return alert("Please type something in the photo link box!");

    let points = (parseInt(selected.value) === quest.quiz.a) ? quest.auto : 0;
    
    const completed = JSON.parse(localStorage.getItem('completedLevels') || "[]");
    completed.push(id);
    localStorage.setItem('completedLevels', JSON.stringify(completed));
    
    const payload = { 
        team: currentTeam, 
        location: quest.loc, 
        taskType: "Quest", 
        content: `Quiz: ${quest.quiz.o[selected.value]} | Media: ${media}`, 
        autoPoints: points 
    };

    alert(points > 0 ? "Correct! +10 Points." : "Task saved!");
    
    // Sync to Sheet
    fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) })
    .then(() => {
        loadDashboard();
        updateMyTeamScore();
    });
}

// DATA SYNC
async function updateMyTeamScore() {
    try {
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getTeamScore&team=${currentTeam}`);
        const data = await res.json();
        document.getElementById('team-live-score').innerText = data.score;
    } catch (e) { document.getElementById('team-live-score').innerText = "?"; }
}

async function fetchLeaderboard() {
    const body = document.getElementById('leaderboard-body');
    const spinner = document.getElementById('loading-spinner');
    spinner.style.display = "block";
    body.innerHTML = "";
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL + "?action=getLeaderboard");
        const data = await res.json();
        spinner.style.display = "none";
        data.rankings.forEach((r, i) => {
            const icon = TEAM_CONFIG[r.team] ? TEAM_CONFIG[r.team].icon : "";
            body.innerHTML += `<tr><td>${i+1}</td><td>${icon} ${r.team}</td><td>${r.points}</td></tr>`;
        });
    } catch (e) { spinner.innerText = "Check back once you have signal!"; }
}

// ADMIN PANEL
function prepAdminLogin() {
    const pass = prompt("Teacher Password:");
    if (pass === "KARNATAKA2026") showSection('admin-panel');
    else alert("Unauthorized.");
}

function resetLocalData() {
    if(confirm("Clear local progress? (Does not delete Google Sheet data)")) {
        localStorage.clear();
        location.reload();
    }
}

function clearAppCache() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
            for(let r of regs) r.unregister();
            location.reload(true);
        });
    }
}

function handleAdminTap() { /* Secret entry removed for dedicated button */ }
