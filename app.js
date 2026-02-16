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
let currentCluesUsed = {}; 

window.onload = () => {
    initTeams();
    if (userTeam) {
        showView('main-view');
        renderQuests();
    }
};

// --- NAVIGATION & UI ---
function showView(id) {
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    if(id === 'main-view') document.getElementById('score-display').style.display = 'block';
}

function initTeams() {
    const grid = document.getElementById('team-selector');
    grid.innerHTML = "";
    Object.keys(TEAMS).forEach(t => {
        const btn = document.createElement('div');
        btn.className = "team-btn";
        btn.innerText = t;
        btn.onclick = () => openPin(t);
        grid.appendChild(btn);
    });
}

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

// --- DATA ENGINE ---
async function syncData() {
    try {
        const res = await fetch(`${SCRIPT_URL}?action=sync`);
        challenges = await res.json();
        localStorage.setItem('challenges', JSON.stringify(challenges));
        renderQuests();
        alert("✅ Trip Data Updated!");
    } catch (e) { alert("📡 Connection error. Try again when you have signal."); }
}

function renderQuests() {
    const cont = document.getElementById('quest-container');
    cont.innerHTML = "";
    const sites = [...new Set(challenges.map(c => c.Site))];

    sites.forEach(site => {
        const isUnlocked = localStorage.getItem(`unlock_${site}`);
        const card = document.createElement('div');
        card.className = "quest-card";
         if (site === "Grand Finale") {
         card.style.borderLeft = "6px solid #FFD700"; // Gold border for the finale
         card.style.background = "#fffdf0";
                       }
        
        if (!isUnlocked) {
            card.innerHTML = `<h3>${site}</h3>
                <input type="text" id="code-${site}" class="quiz-opt" placeholder="Enter Unlock Code">
                <button class="submit-btn" onclick="unlockSite('${site}')">Unlock Location</button>`;
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
        div.innerHTML = `<p>✅ <strong>Task Locked:</strong> ${t.Question}</p>`;
        return div;
    }

    let html = `<p><strong>Task:</strong> ${t.Question}</p>`;
    
    if (t.Type === 'quiz') {
        const opts = t.Options_Clues.split(",");
        html += opts.map((o,i) => `<button class="quiz-opt" onclick="submitQuiz('${t.TaskID}','${t.Site}',${i})">${o}</button>`).join("");
    } 
    else if (t.Type === 'clue') {
        const clues = t.Options_Clues.split("|");
        html += `<p id="clue-text-${t.TaskID}" class="clue-display">Clue 1: ${clues[0]}</p>
                 <button class="clue-btn" onclick="nextClue('${t.TaskID}','${t.Options_Clues}')">Need another clue?</button>
                 <input type="text" id="in-${t.TaskID}" class="quiz-opt" placeholder="Answer">
                 <button class="submit-btn" onclick="submitClue('${t.TaskID}','${t.Site}')">Submit Solve</button>`;
    } 
    else if (t.Type === 'media') {
        html += `<label class="upload-label"><input type="checkbox" id="check-${t.TaskID}"> I have uploaded to Drive</label>
                 <button class="submit-btn" onclick="submitMedia('${t.TaskID}','${t.Site}')">Confirm Submission</button>`;
    } 
    else if (t.Type === 'word') {
        html += `<div id="log-${t.TaskID}" class="puzzle-log">Goal: ${t.CorrectAns.length} letters</div>
                 <input type="text" id="word-in-${t.TaskID}" class="quiz-opt" placeholder="Guess word">
                 <button class="submit-btn" onclick="submitWordGuess('${t.TaskID}','${t.CorrectAns}','${t.Site}')">Check Cow/Bull</button>`;
    }
    else if (t.Type === 'short') {
        html += `<textarea id="text-${t.TaskID}" class="quiz-opt" placeholder="Type your answer here..."></textarea>
                 <button class="submit-btn" onclick="submitShort('${t.TaskID}','${t.Site}')">Submit Answer</button>`;
    }

    div.innerHTML = html;
    return div;
}

// --- LOGIC FUNCTIONS ---
function unlockSite(site) {
    const val = document.getElementById(`code-${site}`).value.toUpperCase();
    const correct = challenges.find(c => c.Site === site).SiteCode.toString().toUpperCase();
    if (val === correct) {
        localStorage.setItem(`unlock_${site}`, "true");
        renderQuests();
    } else { alert("❌ Incorrect Site Code!"); }
}

async function sendSubmission(payload) {
    try {
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        localStorage.setItem(`done_${payload.taskId}`, "true");
        renderQuests();
    } catch (e) { alert("Failed to save. Try again."); }
}

function submitQuiz(id, site, userIndex) {
    const t = challenges.find(task => task.TaskID === id);
    const isCorrect = (userIndex == t.CorrectAns);
    const finalPts = isCorrect ? parseInt(t.Points) : 0;
    if(isCorrect) alert("🎯 Correct!"); else alert("❌ Incorrect.");
    sendSubmission({ team: userTeam, site: site, taskId: id, type: 'quiz', content: `Index: ${userIndex}`, autoPts: finalPts });
}

function nextClue(id, cluesStr) {
    const clues = cluesStr.split("|");
    currentCluesUsed[id] = (currentCluesUsed[id] || 1);
    if (currentCluesUsed[id] < clues.length) {
        currentCluesUsed[id]++;
        document.getElementById(`clue-text-${id}`).innerText = "Clue " + currentCluesUsed[id] + ": " + clues[currentCluesUsed[id]-1];
        localStorage.setItem(`clue_count_${id}`, currentCluesUsed[id]);
    } else { alert("No more clues left!"); }
}

function submitClue(id, site) {
    const t = challenges.find(task => task.TaskID === id);
    const userAns = document.getElementById(`in-${id}`).value.toUpperCase().trim();
    const correctAns = t.CorrectAns.toString().toUpperCase().trim();
    if (userAns === correctAns) {
        const count = parseInt(localStorage.getItem(`clue_count_${id}`) || 1);
        let pts = parseInt(t.Points) - ((count - 1) * 5);
        if (pts < 5) pts = 5;
        alert(`🎉 Correct! +${pts} Pts`);
        sendSubmission({ team: userTeam, site: site, taskId: id, type: 'clue', content: userAns, autoPts: pts });
    } else { alert("❌ Wrong answer!"); }
}

function submitWordGuess(id, target, site) {
    const t = challenges.find(task => task.TaskID === id);
    const guess = document.getElementById(`word-in-${id}`).value.toUpperCase();
    if (guess.length !== target.length) return alert("Wrong length!");
    let b = 0, c = 0;
    let tArr = target.split(""), gArr = guess.split("");
    for(let i=0; i<tArr.length; i++) if(gArr[i]===tArr[i]) { b++; tArr[i]=null; gArr[i]=null; }
    for(let i=0; i<gArr.length; i++) if(gArr[i] && tArr.includes(gArr[i])) { c++; tArr[tArr.indexOf(gArr[i])]=null; }
    document.getElementById(`log-${id}`).innerHTML += `<div>${guess}: ${b}B ${c}C</div>`;
    if (b === target.length) {
        alert("🎊 WORD DISCOVERED!");
        sendSubmission({ team: userTeam, site: site, taskId: id, type: 'word', content: guess, autoPts: t.Points });
    }
}

function submitMedia(id, site) {
    if(!document.getElementById(`check-${id}`).checked) return alert("Please check the box first!");
    sendSubmission({ team: userTeam, site: site, taskId: id, type: 'media', content: "Media Uploaded", autoPts: 0 });
}

function submitShort(id, site) {
    const val = document.getElementById(`text-${id}`).value;
    if(!val) return alert("Answer cannot be empty!");
    sendSubmission({ team: userTeam, site: site, taskId: id, type: 'short', content: val, autoPts: 0 });
}

// --- TEACHER ADMIN ---
function openAdmin() {
    if (prompt("Teacher HQ Passcode:") === "KARNATAKA2026") {
        showView('admin-view');
        loadPendingReviews();
    }
}

async function loadPendingReviews() {
    const list = document.getElementById('pending-list');
    list.innerHTML = "Fetching pending tasks...";
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getPending`);
        const tasks = await res.json();
        list.innerHTML = tasks.map(t => `
            <div class="task-item">
                <strong>Team ${t.team}</strong> (${t.loc})<br>
                <em>${t.type}: ${t.content}</em><br>
                <div style="display:flex; gap:10px; margin-top:10px;">
                    <input type="number" id="pts-${t.row}" placeholder="Points" style="width:70px">
                    <button class="primary-btn" onclick="gradeTask(${t.row})">Award</button>
                </div>
            </div>
        `).join('') || "All submissions graded!";
    } catch (e) { list.innerHTML = "Error loading submissions."; }
}

async function gradeTask(rowId) {
    const pts = document.getElementById(`pts-${rowId}`).value;
    if(!pts) return alert("Enter points!");
    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'grade', row: rowId, pts: pts }) });
    alert("Points Assigned.");
    loadPendingReviews();
}

function resetGameForUser() {
    if(confirm("⚠️ WIPE PROGRESS ON THIS DEVICE?")) { localStorage.clear(); location.reload(); }
}
