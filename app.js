const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyH0ey1aVqAx2byXwg8IByOnOJUu-nJOBFGH6YXoQqNRRoAAdVswp7Rs0SbPIg7tzq9Sg/exec";
const SCRIPT_URL = "YOUR_APPS_SCRIPT_URL_HERE";

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
        const banner = document.getElementById('active-team-banner');
        if(banner) banner.innerText = `Team: ${userTeam}`;
        renderQuests();
        updateScoreDisplay();
    } else {
        showView('selection-view');
    }
};

function showView(id) {
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(id);
    if(target) target.style.display = 'block';
}

function initTeams() {
    const grid = document.getElementById('team-selector');
    if (!grid) return;
    grid.innerHTML = "";
    Object.keys(TEAMS).forEach(t => {
        const btn = document.createElement('div');
        btn.className = "team-btn";
        btn.innerHTML = `
            <img src="icons/${t}.png" class="team-icon" onerror="this.src='icons/default.png'">
            <div class="team-label">${t}</div>
        `;
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

async function updateScoreDisplay() {
    if(!userTeam) return;
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getScore&team=${userTeam}`);
        const total = await res.text();
        document.getElementById('my-pts').innerText = total;
    } catch (e) { console.log("Score update failed"); }
}

async function syncData() {
    try {
        const res = await fetch(`${SCRIPT_URL}?action=sync`);
        challenges = await res.json();
        localStorage.setItem('challenges', JSON.stringify(challenges));
        renderQuests();
        alert("✅ Sync Complete!");
    } catch (e) { alert("📡 Sync failed. Check internet."); }
}

function renderQuests() {
    const cont = document.getElementById('quest-container');
    if(!cont) return;
    cont.innerHTML = "";
    const sites = [...new Set(challenges.map(c => c.Site))];

    sites.forEach(site => {
        const isUnlocked = localStorage.getItem(`unlock_${site}`);
        const card = document.createElement('div');
        card.className = "quest-card";
        if (site === "Grand Finale") card.classList.add('finale-card');
        
        if (!isUnlocked) {
            card.innerHTML = `<h3>${site}</h3>
                <input type="text" id="code-${site}" class="quiz-opt" placeholder="Unlock Code">
                <button class="submit-btn" onclick="unlockSite('${site}')">Unlock</button>`;
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
        html += opts.map((o,i) => `<button class="quiz-opt" onclick="submitQuiz('${t.TaskID}','${t.Site}',${i})">${o}</button>`).join("");
    } else if (t.Type === 'clue') {
        const clues = t.Options_Clues.split("|");
        html += `<p id="clue-text-${t.TaskID}" class="clue-display">Clue 1: ${clues[0]}</p>
                 <button class="clue-btn" onclick="nextClue('${t.TaskID}','${t.Options_Clues}')">Next Clue (-5 pts)</button>
                 <input type="text" id="in-${t.TaskID}" class="quiz-opt" placeholder="Answer...">
                 <button class="submit-btn" onclick="submitClue('${t.TaskID}','${t.Site}')">Submit</button>`;
    } else if (t.Type === 'word') {
        html += `<div id="log-${t.TaskID}" class="puzzle-log">Target: ${t.CorrectAns.length} letters</div>
                 <input type="text" id="word-in-${t.TaskID}" class="quiz-opt" placeholder="Guess">
                 <button class="submit-btn" onclick="submitWordGuess('${t.TaskID}','${t.CorrectAns}','${t.Site}')">Check</button>`;
    } else {
        html += `<button class="submit-btn" onclick="submitManual('${t.TaskID}','${t.Site}','${t.Type}')">I've completed this!</button>`;
    }

    div.innerHTML = html;
    return div;
}

function unlockSite(site) {
    const val = document.getElementById(`code-${site}`).value.toUpperCase();
    const correct = challenges.find(c => c.Site === site).SiteCode.toString().toUpperCase();
    if (val === correct) {
        localStorage.setItem(`unlock_${site}`, "true");
        renderQuests();
    } else { alert("Wrong Code!"); }
}

async function sendSubmission(payload) {
    try {
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        localStorage.setItem(`done_${payload.taskId}`, "true");
        renderQuests();
        setTimeout(updateScoreDisplay, 2000);
    } catch (e) { alert("Submit failed."); }
}

function submitQuiz(id, site, idx) {
    const t = challenges.find(x => x.TaskID === id);
    const isCorrect = (idx == t.CorrectAns);
    const pts = isCorrect ? parseInt(t.Points) : 0;
    if(isCorrect) alert("Correct!"); else alert("Incorrect.");
    sendSubmission({ team: userTeam, site: site, taskId: id, type: 'quiz', content: `Choice ${idx}`, autoPts: pts });
}

function nextClue(id, cluesStr) {
    const clues = cluesStr.split("|");
    currentCluesUsed[id] = (currentCluesUsed[id] || 1);
    if (currentCluesUsed[id] < clues.length) {
        currentCluesUsed[id]++;
        document.getElementById(`clue-text-${id}`).innerText = "Clue " + currentCluesUsed[id] + ": " + clues[currentCluesUsed[id]-1];
        localStorage.setItem(`clue_count_${id}`, currentCluesUsed[id]);
    }
}

function submitClue(id, site) {
    const t = challenges.find(x => x.TaskID === id);
    const ans = document.getElementById(`in-${id}`).value.toUpperCase().trim();
    if (ans === t.CorrectAns.toString().toUpperCase().trim()) {
        const used = parseInt(localStorage.getItem(`clue_count_${id}`) || 1);
        let pts = parseInt(t.Points) - ((used - 1) * 5);
        sendSubmission({ team: userTeam, site: site, taskId: id, type: 'clue', content: ans, autoPts: Math.max(pts, 5) });
        alert("Correct!");
    } else { alert("Try again!"); }
}

function submitWordGuess(id, target, site) {
    const guess = document.getElementById(`word-in-${id}`).value.toUpperCase();
    if (guess.length !== target.length) return alert("Wrong length");
    let b=0, c=0;
    let tArr=target.toUpperCase().split(""), gArr=guess.split("");
    for(let i=0;i<tArr.length;i++) if(gArr[i]===tArr[i]){b++; tArr[i]=null; gArr[i]=null;}
    for(let i=0;i<gArr.length;i++) if(gArr[i] && tArr.includes(gArr[i])){c++; tArr[tArr.indexOf(gArr[i])]=null;}
    document.getElementById(`log-${id}`).innerHTML += `<div>${guess}: ${b}B ${c}C</div>`;
    if(b === target.length) {
        const t = challenges.find(x => x.TaskID === id);
        sendSubmission({ team: userTeam, site: site, taskId: id, type: 'word', content: guess, autoPts: t.Points });
        alert("Success!");
    }
}

function submitManual(id, site, type) {
    sendSubmission({ team: userTeam, site: site, taskId: id, type: type, content: "Submitted", autoPts: 0 });
    alert("Sent to teacher for review!");
}

function logout() { localStorage.removeItem('team'); location.reload(); }

function openAdmin() {
    if (prompt("Admin Pass:") === "KARNATAKA2026") showView('admin-view');
}

function resetGameForUser() {
    if(confirm("WIPE DATA?")) { localStorage.clear(); location.reload(); }
}
