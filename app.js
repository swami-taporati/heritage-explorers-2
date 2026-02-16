const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyH0ey1aVqAx2byXwg8IByOnOJUu-nJOBFGH6YXoQqNRRoAAdVswp7Rs0SbPIg7tzq9Sg/exec";

const TEAMS = {
    "Indian Roller": { pin: "4921", folder: "https://drive.google.com/drive/folders/1Awv_3NvjvPhbnYXyZ-iELT3RA-SZdOBy?usp=drive_link" },
    "Asian Elephant": { pin: "8374", folder: "https://drive.google.com/drive/folders/17FiZFV9g_5xfys1Parn8ZSD50aozR9l5?usp=drive_link" },
    "Lotus": { pin: "2569", folder: "https://drive.google.com/drive/folders/1O4N5IMxpN25aXuK33A608KxFGcixT3WE?usp=drive_link" },
    "Sandalwood": { pin: "7103", folder: "https://drive.google.com/drive/folders/1-qX4XPk6XCogJK9Wg13gfBeMFFtTMcdB?usp=drive_link" },
    "Mango": { pin: "6482", folder: "https://drive.google.com/drive/folders/1a15Jo6htUwOtEhaYZrd_hSOQXm6Sp0bl?usp=drive_link" }
};

let userTeam = localStorage.getItem('team');
let challenges = JSON.parse(localStorage.getItem('challenges') || "[]");
let selectedTeamTemp = "";

window.onload = () => {
    initTeams();
    if (userTeam) {
        showView('main-view');
        const banner = document.getElementById('active-team-banner');
        if(banner) banner.innerText = `Team: ${userTeam}`;
        renderQuests();
        updateScoreDisplay();
        updateLeaderboard();
    }
};

function showView(id) {
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(id);
    if(target) target.style.display = 'block';
}

function goBack() {
    renderQuests();
    window.scrollTo(0, 0);
}

function initTeams() {
    const grid = document.getElementById('team-selector');
    if(!grid) return;
    grid.innerHTML = "";
    Object.keys(TEAMS).forEach(t => {
        const btn = document.createElement('div');
        btn.className = "team-btn";
        btn.innerHTML = `
            <img src="./images/${t}.png" class="team-icon" onerror="this.src='https://img.icons8.com/color/96/group.png'">
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
    const pinInput = document.getElementById('pin-input').value;
    if (TEAMS[selectedTeamTemp].pin === pinInput) {
        userTeam = selectedTeamTemp;
        localStorage.setItem('team', userTeam);
        location.reload();
    } else { alert("Wrong PIN!"); }
}

async function syncData() {
    const btn = document.querySelector('.sync-btn');
    if(btn) btn.innerText = "⏳ Syncing...";
    try {
        const res = await fetch(`${SCRIPT_URL}?action=sync`);
        challenges = await res.json();
        localStorage.setItem('challenges', JSON.stringify(challenges));
        renderQuests();
        if(btn) btn.innerText = "✅ Sync Done";
    } catch (e) { alert("Sync failed"); }
    setTimeout(() => { if(btn) btn.innerText = "🔄 Sync Challenges"; }, 2000);
}

function renderQuests() {
    const cont = document.getElementById('quest-container');
    if(!cont) return;
    cont.innerHTML = "";
    if (challenges.length === 0) {
        cont.innerHTML = "<p style='text-align:center; padding:20px;'>No challenges found. Please Sync.</p>";
        return;
    }
    const sites = [...new Set(challenges.map(c => c.Site))];
    sites.forEach(site => {
        const isUnlocked = localStorage.getItem(`unlock_${site}`) === "true";
        const card = document.createElement('div');
        card.className = "quest-card";
        if (!isUnlocked) {
            card.innerHTML = `
                <h3 style="color: #777;">🔒 ${site}</h3>
                <input type="text" id="code-${site}" class="quiz-opt" placeholder="Unlock Code">
                <button class="submit-btn" onclick="unlockSite('${site}')">Unlock Site</button>
            `;
        } else {
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; margin-bottom:10px;">
                    <h3>📍 ${site}</h3>
                    <button onclick="goBack()" class="back-link">Back</button>
                </div>
            `;
            challenges.filter(c => c.Site === site).forEach(t => card.appendChild(createTaskUI(t)));
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
    let html = `<p><strong>${t.Type.toUpperCase()}:</strong> ${t.Question}</p>`;
    if (t.Type === 'quiz') {
        const opts = t.Options_Clues.split(",");
        html += `<div class="btn-group" style="display:flex; flex-direction:column; gap:8px;">`;
        opts.forEach((o, i) => html += `<button class="quiz-opt" onclick="submitQuiz('${t.TaskID}','${t.Site}',${i})">${o.trim()}</button>`);
        html += `</div>`;
    } else if (t.Type === 'clue') {
        const clues = t.Options_Clues.split("|");
        html += `
            <p id="clue-text-${t.TaskID}" class="clue-display">Clue 1: ${clues[0]}</p>
            <button class="clue-btn" onclick="nextClue('${t.TaskID}','${t.Options_Clues}')">Next Clue (-5 pts)</button>
            <input type="text" id="in-${t.TaskID}" class="quiz-opt" placeholder="Answer...">
            <button class="submit-btn" onclick="submitClue('${t.TaskID}','${t.Site}')">Submit</button>
        `;
    } else if (t.Type === 'cowbull') {
        html += `
            <div id="log-${t.TaskID}" class="puzzle-log" style="font-family:monospace; background:#eee; padding:5px; margin:5px 0;">Target: ${t.CorrectAns.length} letters</div>
            <input type="text" id="in-${t.TaskID}" class="quiz-opt" placeholder="Guess...">
            <button class="submit-btn" onclick="submitCowBull('${t.TaskID}','${t.CorrectAns}','${t.Site}')">Check</button>
        `;
    } else if (t.Type === 'media') {
        const folder = TEAMS[userTeam] ? TEAMS[userTeam].folder : "#";
        html += `
            <button class="clue-btn" style="background:#34a853; color:white;" onclick="window.open('${folder}', '_blank')">📁 Open Team Folder</button>
            <input type="text" id="in-${t.TaskID}" class="quiz-opt" placeholder="Type 'DONE'...">
            <button class="submit-btn" onclick="submitManual('${t.TaskID}','${t.Site}','media')">Confirm</button>
        `;
    } else {
        html += `
            <input type="text" id="in-${t.TaskID}" class="quiz-opt" placeholder="Your answer...">
            <button class="submit-btn" onclick="submitManual('${t.TaskID}','${t.Site}','word')">Send</button>
        `;
    }
    div.innerHTML = html;
    return div;
}

function unlockSite(site) {
    const val = document.getElementById(`code-${site}`).value.toUpperCase().trim();
    const siteData = challenges.find(c => c.Site === site);
    if (!siteData) return;
    const correct = siteData.SiteCode.toString().toUpperCase().trim();
    if (val === correct) {
        localStorage.setItem(`unlock_${site}`, "true");
        renderQuests();
    } else { alert("Incorrect Site Code!"); }
}

async function sendSubmission(payload) {
    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
    localStorage.setItem(`done_${payload.taskId}`, "true");
    renderQuests();
    setTimeout(updateScoreDisplay, 2000);
    setTimeout(updateLeaderboard, 2000);
}

function submitQuiz(id, site, idx) {
    const t = challenges.find(x => x.TaskID === id);
    const isCorrect = (idx == t.CorrectAns);
    sendSubmission({ team: userTeam, site: site, taskId: id, type: 'quiz', content: `Idx: ${idx}`, autoPts: isCorrect ? parseInt(t.Points) : 0 });
    alert(isCorrect ? "🌟 Correct!" : "❌ Incorrect.");
}

function nextClue(id, cluesStr) {
    const clues = cluesStr.split("|");
    let count = parseInt(localStorage.getItem(`clue_count_${id}`) || 1);
    if (count < clues.length) {
        count++;
        localStorage.setItem(`clue_count_${id}`, count);
        document.getElementById(`clue-text-${id}`).innerText = `Clue ${count}: ${clues[count - 1]}`;
    }
}

function submitClue(id, site) {
    const t = challenges.find(x => x.TaskID === id);
    const ans = document.getElementById(`in-${id}`).value.toUpperCase().trim();
    if (ans === t.CorrectAns.toString().toUpperCase().trim()) {
        let count = parseInt(localStorage.getItem(`clue_count_${id}`) || 1);
        let finalPts = Math.max(parseInt(t.Points) - ((count - 1) * 5), 5);
        sendSubmission({ team: userTeam, site: site, taskId: id, type: 'clue', content: ans, autoPts: finalPts });
        alert(`Correct! Points: ${finalPts}`);
    } else { alert("Try again!"); }
}

function submitCowBull(id, target, site) {
    const guess = document.getElementById(`in-${id}`).value.toUpperCase().trim();
    if (guess.length !== target.length) return alert(`Need ${target.length} letters`);
    let b = 0, c = 0;
    let tArr = target.toUpperCase().split("");
    let gArr = guess.split("");
    for(let i=0; i<tArr.length; i++) if(gArr[i]===tArr[i]) { b++; tArr[i]=null; gArr[i]=null; }
    for(let i=0; i<gArr.length; i++) if(gArr[i] && tArr.indexOf(gArr[i])!==-1) { c++; tArr[tArr.indexOf(gArr[i])]=null; }
    document.getElementById(`log-${id}`).innerHTML += `<div>${guess}: ${b}B, ${c}C</div>`;
    if (b === target.length) {
        sendSubmission({ team: userTeam, site: site, taskId: id, type: 'cowbull', content: guess, autoPts: 20 });
        alert("🎉 Correct!");
    }
}

function submitManual(id, site, type) {
    const val = document.getElementById(`in-${id}`).value.trim();
    if (val.length < 2) return alert("Enter an answer");
    sendSubmission({ team: userTeam, site: site, taskId: id, type: type, content: val, autoPts: 0 });
    alert("Sent to Teacher!");
}

async function updateScoreDisplay() {
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getScore&team=${userTeam}`);
        const pts = await res.text();
        if(document.getElementById('my-pts')) document.getElementById('my-pts').innerText = pts;
    } catch(e) { console.log("Score update failed"); }
}

async function updateLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    if(!container) return;
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getLeaderboard`);
        const data = await res.json();
        data.sort((a, b) => b.score - a.score);
        container.innerHTML = data.map((item, index) => `
            <div class="score-row"><span>${index + 1}. ${item.team}</span><span><strong>${item.score}</strong></span></div>
        `).join("");
    } catch (e) { container.innerHTML = "<p>Leaderboard unavailable offline</p>"; }
}

async function triggerFinalReveal() {
    if (!confirm("Ready to reveal the final winner on this device?")) return;
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getLeaderboard`);
        const data = await res.json();
        data.sort((a, b) => b.score - a.score);
        const winner = data[0];
        document.getElementById('winner-team-name').innerText = winner.team;
        document.getElementById('winner-score').innerText = `With ${winner.score} Points!`;
        document.getElementById('winner-overlay').style.display = 'flex';
    } catch (e) { alert("Error fetching scores. Check internet."); }
}

function logout() { localStorage.removeItem('team'); location.reload(); }
function openAdmin() { if (prompt("Pass:") === "KARNATAKA2026") { showView('admin-view'); renderPending(); } }

async function renderPending() {
    const res = await fetch(`${SCRIPT_URL}?action=getPending`);
    const data = await res.json();
    document.getElementById('pending-list').innerHTML = data.map(i => `
        <div class="quest-card" style="border-left:5px solid gold;">
            <p><strong>Team:</strong> ${i.team}</p>
            <p><strong>Answer:</strong> ${i.content}</p>
            <input type="number" id="p-${i.row}" placeholder="Points" style="width:80px; padding:5px;">
            <button onclick="approveTask(${i.row})" style="padding:5px 10px; background:green; color:white; border:none; border-radius:4px;">Approve</button>
        </div>`).join("");
}

async function approveTask(row) {
    const pts = document.getElementById(`p-${row}`).value;
    if(!pts) return alert("Enter points");
    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "grade", row: row, pts: pts })});
    alert("Graded!");
    renderPending();
}

function resetGameForUser() { if(confirm("This will clear all progress on THIS device. Proceed?")) { localStorage.clear(); location.reload(); } }
