const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwus5oJWiCpHM-lODpl2Ttleq2vNb7ZPEnxeBYMgQ2NB6lc15at8NysJrE3ZLCq01NN/exec";

const TEAM_CONFIG = {
    "Indian Roller": { pin: "4921", icon: '<img src="images/roller.png">' },
    "Asian Elephant": { pin: "8374", icon: '<img src="images/elephant.png">' },
    "Lotus": { pin: "2569", icon: '<img src="images/lotus.png">' },
    "Sandalwood": { pin: "7103", icon: '<img src="images/sandalwood.png">' },
    "Mango": { pin: "6482", icon: '<img src="images/mango.png">' }
};

const QUEST_DATA = [
    { id: 1, loc: "Bannerghatta", code: "WILD26", task: "Capture a photo of a Tiger or Lion during the Safari.", quiz: { q: "What is the state animal of Karnataka?", o: ["Bengal Tiger", "Asian Elephant", "Indian Roller", "Leopard"], a: 1 }, auto: 10 },
    { id: 2, loc: "Indian Music Museum", code: "RAGA", task: "Record a video of your team trying to play a percussion instrument.", quiz: { q: "Which of these is a famous string instrument seen here?", o: ["Veena", "Flute", "Tabla", "Drums"], a: 0 }, auto: 10 },
    { id: 3, loc: "Hampi (Virupaksha)", code: "RAYA", task: "Find the inverted shadow of the Gopuram and take a photo.", quiz: { q: "Hampi was the capital of which empire?", o: ["Mughal", "Chola", "Vijayanagara", "Maratha"], a: 2 }, auto: 10 },
    { id: 4, loc: "Hampi (Vittala)", code: "CHARIOT", task: "Group photo at the Stone Chariot. Recreate the pose of a sculpture.", quiz: { q: "What is unique about the pillars in the Vittala Temple?", o: ["They are made of wood", "They produce musical notes", "They are 100ft tall", "They are made of gold"], a: 1 }, auto: 10 },
    { id: 5, loc: "JSW Kaladham", code: "STEEL", task: "Take a selfie with the 'Utsav' 3D exhibition background.", quiz: { q: "JSW Vidyanagar is known for producing what?", o: ["Steel", "Silk", "Coffee", "Sandalwood"], a: 0 }, auto: 10 },
    { id: 6, loc: "Chitradurga Fort", code: "OBAVVA", task: "Video of a team member explaining the legend of Onake Obavva at the 'Kalla Kindi'.", quiz: { q: "How many walls (Saptapadi) does Chitradurga Fort have?", o: ["3", "5", "7", "9"], a: 2 }, auto: 10 },
    { id: 7, loc: "Agumbe (Trek)", code: "RAIN", task: "Identify a medicinal plant and describe its use as told by the farmer.", quiz: { q: "Agumbe is often called the _____ of South India.", o: ["Ooty", "Cherrapunji", "Kashmir", "Mysuru"], a: 1 }, auto: 10 },
    { id: 8, loc: "Sringeri", code: "SHARADA", task: "Photo of the Tunga river fish being fed. Find the 12 Zodiac pillars.", quiz: { q: "Who established the Sringeri Sharada Peetham?", o: ["Adi Shankara", "Basavanna", "Madhvacharya", "Ramanuja"], a: 0 }, auto: 10 },
    { id: 9, loc: "Mangaluru (Kambala)", code: "BUFFALO", task: "Video of the team cheering during a Kambala race reenactment.", quiz: { q: "Kambala is a traditional race involving which animal?", o: ["Horses", "Bulls", "Buffaloes", "Camels"], a: 2 }, auto: 10 }
];

let currentTeam = localStorage.getItem('activeTeam') || null;
let selectedTeamTemp = "";
let tapCount = 0;

// Init
window.onload = () => { if (currentTeam) { showSection('dashboard'); loadDashboard(); } };

function showSection(id) {
    document.querySelectorAll('.page-section, #login-screen').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.getElementById('main-nav').style.display = currentTeam ? 'flex' : 'none';
}

function prepLogin(team) { selectedTeamTemp = team; document.getElementById('modal-team-name').innerText = "Team " + team; document.getElementById('pin-modal').style.display = 'flex'; }
function hidePinEntry() { document.getElementById('pin-modal').style.display = 'none'; }

function login() {
    const pin = document.getElementById('team-pin').value;
    if (TEAM_CONFIG[selectedTeamTemp].pin === pin) {
        currentTeam = selectedTeamTemp;
        localStorage.setItem('activeTeam', currentTeam);
        location.reload();
    } else { alert("Wrong PIN!"); }
}

function loadDashboard() {
    const container = document.getElementById('quest-container');
    const completed = JSON.parse(localStorage.getItem('completedLevels') || "[]");
    document.getElementById('user-team-display').innerHTML = `${TEAM_CONFIG[currentTeam].icon} Team ${currentTeam}`;
    container.innerHTML = "";

    QUEST_DATA.forEach(q => {
        const isDone = completed.includes(q.id);
        const card = document.createElement('div');
        card.className = "quest-card";
        card.innerHTML = isDone ? `<h3>${q.loc}</h3><p style="color:green;font-weight:bold;">✅ CHALLENGE COMPLETE</p>` : `
            <h3>${q.loc}</h3>
            <div id="lock-${q.id}">
                <input type="text" id="code-${q.id}" placeholder="Enter Unlock Code">
                <button class="primary-btn" onclick="unlock(${q.id})">Unlock Challenge</button>
            </div>
            <div id="task-${q.id}" style="display:none;" class="task-area">
                <h4>📸 Task</h4><p>${q.task}</p><hr>
                <h4>🧠 Quiz</h4><p>${q.quiz.q}</p>
                ${q.quiz.o.map((opt, i) => `<label class="quiz-opt"><input type="radio" name="q-${q.id}" value="${i}"> ${opt}</label>`).join('')}
                <button class="submit-btn" onclick="submit(${q.id})">Submit to Teacher</button>
            </div>`;
        container.appendChild(card);
    });
}

function unlock(id) {
    const code = document.getElementById(`code-${id}`).value.toUpperCase();
    if (code === QUEST_DATA.find(q => q.id === id).code) {
        document.getElementById(`task-${id}`).style.display = "block";
        document.getElementById(`lock-${id}`).style.display = "none";
    } else { alert("Incorrect Code!"); }
}

function submit(id) {
    const quest = QUEST_DATA.find(q => q.id === id);
    const selected = document.querySelector(`input[name="q-${id}"]:checked`);
    if (!selected) return alert("Answer the quiz first!");

    let points = (parseInt(selected.value) === quest.quiz.a) ? quest.auto : 0;
    const completed = JSON.parse(localStorage.getItem('completedLevels') || "[]");
    completed.push(id);
    localStorage.setItem('completedLevels', JSON.stringify(completed));
    
    // Send to Sheet
    const payload = { team: currentTeam, location: quest.loc, taskType: "Quest", content: "Quiz Answered", autoPoints: points };
    fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
    
    alert(points > 0 ? "Correct! +10 Points." : "Wrong answer, but task saved!");
    loadDashboard();
}

async function fetchLeaderboard() {
    const body = document.getElementById('leaderboard-body');
    body.innerHTML = "Loading...";
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL + "?action=getLeaderboard");
        const data = await res.json();
        body.innerHTML = "";
        data.rankings.forEach((r, i) => {
            const icon = TEAM_CONFIG[r.team] ? TEAM_CONFIG[r.team].icon : "";
            body.innerHTML += `<tr><td>${i+1}</td><td>${icon} ${r.team}</td><td>${r.points}</td></tr>`;
        });
    } catch (e) { body.innerHTML = "Offline - check back later."; }
}

function handleAdminTap() { tapCount++; if (tapCount === 3) { if(prompt("Pass:") === "KARNATAKA2026") showSection('admin-panel'); tapCount = 0; } }
function resetAllTeams() { if(confirm("Wipe all data?")) { localStorage.clear(); location.reload(); } }
function logout() { localStorage.removeItem('activeTeam'); location.reload(); }
