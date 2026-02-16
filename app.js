const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyH0ey1aVqAx2byXwg8IByOnOJUu-nJOBFGH6YXoQqNRRoAAdVswp7Rs0SbPIg7tzq9Sg/exec";

const TEAMS = {
    "Indian Roller": { pin: "4921" },
    "Asian Elephant": { pin: "8374" },
    "Lotus": { pin: "2569" },
    "Sandalwood": { pin: "7103" },
    "Mango": { pin: "6482" }
};

let userTeam = localStorage.getItem('team');
let challenges = JSON.parse(localStorage.getItem('challenges') || "[]");
let selectedTeamTemp = "";

window.onload = () => {
    initTeams();
    if (userTeam) {
        showView('main-view');
        renderQuests();
        updateScoreDisplay();
    }
};

function showView(id) {
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    if(id === 'main-view') document.getElementById('score-display').style.display = 'block';
}

function initTeams() {
    const grid = document.getElementById('team-selector');
    Object.keys(TEAMS).forEach(t => {
        const btn = document.createElement('div');
        btn.className = "team-btn";
        btn.innerText = t;
        btn.onclick = () => openPin(t);
        grid.appendChild(btn);
    });
}

// --- LOGIN LOGIC ---
function openPin(team) {
    selectedTeamTemp = team;
    document.getElementById('target-team').innerText = team;
    document.getElementById('pin-modal').style.display = 'flex';
}

function closeModal() { document.getElementById('pin-modal').style.display = 'none'; }

function checkLogin() {
    const pin = document.getElementById('pin-input').value;
    if (TEAMS[selectedTeamTemp].pin === pin) {
        userTeam = selectedTeamTemp;
        localStorage.setItem('team', userTeam);
        location.reload();
    } else { alert("Wrong PIN!"); }
}

function logout() { localStorage.removeItem('team'); location.reload(); }

// --- DATA SYNC ---
async function syncData() {
    try {
        const res = await fetch(`${SCRIPT_URL}?action=sync`);
        challenges = await res.json();
        localStorage.setItem('challenges', JSON.stringify(challenges));
        renderQuests();
        alert("Trip Data Synchronized!");
    } catch (e) { alert("Offline. Connect to internet to sync."); }
}

// --- RENDER DASHBOARD ---
function renderQuests() {
    const cont = document.getElementById('quest-container');
    cont.innerHTML = "";
    const sites = [...new Set(challenges.map(c => c.Site))];

    sites.forEach(site => {
        const isUnlocked = localStorage.getItem(`unlock_${site}`);
        const card = document.createElement('div');
        card.className = "quest-card";
        
        if (!isUnlocked) {
            card.innerHTML = `<h3>${site}</h3>
                <p style="font-size:0.8rem">Site Locked. Enter the code provided by your teacher.</p>
                <input type="text" id="code-${site}" class="quiz-opt" placeholder="Unlock Code">
                <button class="submit-btn" onclick="unlockSite('${site}')">Unlock Site</button>`;
        } else {
            card.innerHTML = `<h3>${site}</h3>`;
            challenges.filter(c => c.Site === site).forEach(t => {
                card.appendChild(createTaskUI(t));
            });
        }
        cont.appendChild(card);
    });
}

function createTaskUI(t) {
    const div = document.createElement('div');
    const isDone = localStorage.getItem(`done_${t.TaskID}`);
    div.className = `task-item ${isDone ? 'locked-task' : ''}`;
    
    if (isDone) {
        div.innerHTML = `<p>✅ <strong>Completed:</strong> ${t.Question}</p>`;
        return div;
    }

    let html = `<p><strong>Task:</strong> ${t.Question}</p>`;
    if (t.Type === 'quiz') {
        const opts = t.Options_Clues.split(",");
        html += opts.map((o,i) => `<button class="quiz-opt" onclick="submitQuiz('${t.TaskID}','${t.Site}',${i},${t.Answer_Pts})">${o}</button>`).join("");
    } else if (t.Type === 'clue') {
        const clues = t.Options_Clues.split("|");
        html += `<p id="clue-text-${t.TaskID}" style="font-style:italic; color:#555;">Clue 1: ${clues[0]}</p>
                 <button class="clue-btn" onclick="nextClue('${t.TaskID}','${t.Options_Clues}')">Next Clue</button>
                 <input type="text" id="in-${t.TaskID}" class="quiz-opt" placeholder="Answer">
                 <button class="submit-btn" onclick="submitClue('${t.TaskID}','${t.Site}','${t.Answer_Pts}')">Submit Solve</button>`;
    } else if (t.Type === 'media') {
        html += `<label><input type="checkbox" id="check-${t.TaskID}"> Uploaded to Drive Folder</label>
                 <button class="submit-btn" onclick="submitMedia('${t.TaskID}','${t.Site}')">Confirm Submission</button>`;
    } else if (t.Type === 'word') {
        html += `<div id="log-${t.TaskID}" class="puzzle-log">Target: ${t.Answer_Pts.length} letters</div>
                 <input type="text" id="word-in-${t.TaskID}" class="quiz-opt" placeholder="Guess word">
                 <button class="submit-btn" onclick="submitWordGuess('${t.TaskID}','${t.Answer_Pts}','${t.Site}')">Check Cow/Bull</button>`;
    } else if (t.Type === 'short') {
        html += `<textarea id="text-${t.TaskID}" class="quiz-opt" placeholder="Your answer..."></textarea>
                 <button class="submit-btn" onclick="submitShort('${t.TaskID}','${t.Site}')">Submit Answer</button>`;
    }
    div.innerHTML = html;
    return div;
}

// --- SUBMISSION LOGIC ---
async function sendToSheet(payload) {
    try {
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        localStorage.setItem(`done_${payload.taskId}`, "true");
        renderQuests();
    } catch (e) { alert("Save failed. Try again."); }
}

function unlockSite(site) {
    const val = document.getElementById(`code-${site}`).value.toUpperCase();
    const correct = challenges.find(c => c.Site === site).SiteCode.toUpperCase();
    if (val === correct) {
        localStorage.setItem(`unlock_${site}`, "true");
        renderQuests();
    } else { alert("Incorrect site code!"); }
}

function submitQuiz(id, site, val, correct) {
    const pts = (val == correct) ? 10 : 0;
    sendToSheet({ team: userTeam, site: site, taskId: id, type: 'quiz', content: `Choice: ${val}`, autoPts: pts });
}

function submitWordGuess(id, target, site) {
    const guess = document.getElementById(`word-in-${id}`).value.toUpperCase();
    if (guess.length !== target.length) return alert("Wrong length!");
    let b = 0, c = 0;
    let tArr = target.split(""), gArr = guess.split("");
    for(let i=0; i<tArr.length; i++) if(gArr[i]===tArr[i]) { b++; tArr[i]=null; gArr[i]=null; }
    for(let i=0; i<gArr.length; i++) if(gArr[i] && tArr.includes(gArr[i])) { c++; tArr[tArr.indexOf(gArr[i])]=null; }
    document.getElementById(`log-${id}`).innerHTML += `<div>${guess}: ${b}B ${c}C</div>`;
    if (b === target.length) sendToSheet({ team: userTeam, site: site, taskId: id, type: 'word', content: guess, autoPts: 20 });
}

// --- TEACHER ADMIN LOGIC ---
function openAdmin() {
    if (prompt("Passcode:") === "KARNATAKA2026") {
        showView('admin-view');
        loadPendingReviews();
    }
}

async function loadPendingReviews() {
    const list = document.getElementById('pending-list');
    list.innerHTML = "Loading...";
    const res = await fetch(`${SCRIPT_URL}?action=getPending`);
    const tasks = await res.json();
    list.innerHTML = tasks.map(t => `
        <div class="task-item">
            <strong>${t.team}</strong> (${t.loc})<br>
            <em>${t.type}: ${t.content}</em><br>
            <input type="number" id="pts-${t.row}" placeholder="Points">
            <button onclick="gradeTask(${t.row})">Award</button>
        </div>
    `).join('') || "No pending tasks!";
}

async function gradeTask(row) {
    const pts = document.getElementById(`pts-${row}`).value;
    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'grade', row: row, pts: pts }) });
    alert("Points Assigned!");
    loadPendingReviews();
}

function resetGameForUser() {
    if(confirm("Wipe THIS device?")) { localStorage.clear(); location.reload(); }
}

async function updateScoreDisplay() {
    // Optional: Fetch total points for the logged in team and update #my-pts
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Offline Engine Active'))
      .catch(err => console.log('Offline Engine Failed', err));
  });
}
