const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyH0ey1aVqAx2byXwg8IByOnOJUu-nJOBFGH6YXoQqNRRoAAdVswp7Rs0SbPIg7tzq9Sg/exec";

// FIXED: Merged TEAMS into one single declaration
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
        updateLeaderboard(); // Ensure leaderboard loads on start
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
                <h3 style="color: #777;">🔒 ${site} (Locked)</h3>
                <p style="font-size: 0.8em;">Enter the code found at this location to begin.</p>
                <input type="text" id="code-${site}" class="quiz-opt" placeholder="Unlock Code">
                <button class="submit-btn" onclick="unlockSite('${site}')">Unlock Site</button>
            `;
        } else {
            // Header with Back Button
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; margin-bottom:10px;">
                    <h3>📍 ${site}</h3>
                    <button onclick="goBack()" style="background:none; border:none; color:blue; text-decoration:underline; font-size:0.8em;">Back</button>
                </div>
            `;
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

    let html = `<p><strong>${t.Type.toUpperCase()}:</strong> ${t.Question}</p>`;
    
    if (t.Type === 'quiz') {
        const opts = t.Options_Clues.split(",");
        html += `<div class="btn-group" style="display:flex; flex-direction:column; gap:8px;">`;
        opts.forEach((o, i) => {
            html += `<button class="quiz-opt" onclick="submitQuiz('${t.TaskID}','${t.Site}',${i})">${o.trim()}</button>`;
        });
        html += `</div>`;
    } 
    else if (t.Type === 'clue') {
        const clues = t.Options_Clues.split("|");
        html += `
            <p id="clue-text-${t.TaskID}" class="clue-display">Clue 1: ${clues[0]}</p>
            <button class="clue-btn" onclick="nextClue('${t.TaskID}','${t.Options_Clues}')">Next Clue (-5 pts)</button>
            <input type="text" id="in-${t.TaskID}" class="quiz-opt" placeholder="Answer...">
            <button class="submit-btn" onclick="submitClue('${t.TaskID}','${t.Site}')">Submit</button>
        `;
    } 
    else if (t.Type === 'cowbull') {
        html += `
            <div id="log-${t.TaskID}" class="puzzle-log" style="font-family:monospace; background:#eee; padding:5px; margin:5px 0;">Target: ${t.CorrectAns.length} letters</div>
            <input type="text" id="in-${t.TaskID}" class="quiz-opt" placeholder="Guess...">
            <button class="submit-btn" onclick="submitCowBull('${t.TaskID}','${t.CorrectAns}','${t.Site}')">Check</button>
        `;
    } 
    else if (t.Type === 'media') {
        const folder = TEAMS[userTeam] ? TEAMS[userTeam].folder : "#";
        html += `
            <button class="clue-btn" style="background:#34a853; color:white;" onclick="window.open('${folder}', '_blank')">📁 Open Team Folder</button>
            <input type="text" id="in-${t.TaskID}" class="quiz-opt" placeholder="Type 'DONE'...">
            <button class="submit-btn" onclick="submitManual('${t.TaskID}','${t.Site}','media')">Confirm</button>
        `;
    }
    else {
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
    } else {
        alert("Incorrect Site Code!");
    }
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
    const pts = isCorrect ? parseInt(t.Points) : 0;
    alert(isCorrect ? "🌟 Correct!" : "❌ Incorrect.");
    sendSubmission({ team: userTeam, site: site, taskId: id, type: 'quiz', content: `Idx: ${idx}`, autoPts: pts });
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
    const t
