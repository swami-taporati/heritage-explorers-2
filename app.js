const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyH0ey1aVqAx2byXwg8IByOnOJUu-nJOBFGH6YXoQqNRRoAAdVswp7Rs0SbPIg7tzq9Sg/exec";
const TEAMS = {
    "Indian Roller": { pin: "4921" },
    "Asian Elephant": { pin: "8374" },
    "Lotus": { pin: "2569" },
    "Sandalwood": { pin: "7103" },
    "Mango": { pin: "6482" }
};
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
        document.getElementById('active-team-banner').innerText = `Team: ${userTeam}`;
        renderQuests();
        updateScoreDisplay();
    }
};

function showView(id) {
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

function initTeams() {
    const grid = document.getElementById('team-selector');
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
    if (TEAMS[selectedTeamTemp].pin === document.getElementById('pin-input').value) {
        userTeam = selectedTeamTemp;
        localStorage.setItem('team', userTeam);
        location.reload();
    } else { alert("Wrong PIN!"); }
}

async function syncData() {
    const btn = document.querySelector('.sync-btn');
    btn.innerText = "⏳ Syncing...";
    try {
        const res = await fetch(`${SCRIPT_URL}?action=sync`);
        challenges = await res.json();
        localStorage.setItem('challenges', JSON.stringify(challenges));
        renderQuests();
        btn.innerText = "✅ Sync Done";
    } catch (e) { alert("Sync failed"); }
    setTimeout(() => btn.innerText = "🔄 Sync Challenges", 2000);
}

function renderQuests() {
    const cont = document.getElementById('quest-container');
    cont.innerHTML = "";
    
    // Group challenges by site
    const sites = [...new Set(challenges.map(c => c.Site))];

    sites.forEach(site => {
        const isUnlocked = localStorage.getItem(`unlock_${site}`) === "true";
        const card = document.createElement('div');
        card.className = "quest-card";

        if (!isUnlocked) {
            // ONLY show the unlock box if not unlocked
            card.innerHTML = `
                <h3 style="color: #777;">🔒 ${site} (Locked)</h3>
                <p style="font-size: 0.8em;">Enter the code found at this location to begin.</p>
                <input type="text" id="code-${site}" class="quiz-opt" placeholder="Unlock Code">
                <button class="submit-btn" onclick="unlockSite('${site}')">Unlock Site</button>
            `;
        } else {
            // Show the tasks only if unlocked
            card.innerHTML = `<h3>📍 ${site}</h3>`;
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
    if (isDone) return (div.innerHTML = `<p>✅ Done: ${t.Question}</p>`, div);

    let html = `<p><strong>${t.Type.toUpperCase()}:</strong> ${t.Question}</p>`;
    
    if (t.Type === 'quiz') {
        t.Options_Clues.split(",").forEach((o, i) => {
            html += `<button class="quiz-opt" onclick="submitQuiz('${t.TaskID}','${t.Site}',${i})">${o.trim()}</button>`;
        });
    } else if (t.Type === 'clue') {
        const clues = t.Options_Clues.split("|");
        html += `<p id="clue-text-${t.TaskID}" class="clue-display">Clue 1: ${clues[0]}</p>
                 <button class="clue-btn" onclick="nextClue('${t.TaskID}','${t.Options_Clues}')">Next Clue</button>
                 <input type="text" id="in-${t.TaskID}" class="quiz-opt" placeholder="Answer...">
                 <button class="submit-btn" onclick="submitClue('${t.TaskID}','${t.Site}')">Submit</button>`;
    } else if (t.Type === 'cowbull') {
        html += `<div id="log-${t.TaskID}" class="puzzle-log">Attempts left: 10</div>
                 <input type="text" id="in-${t.TaskID}" class="quiz-opt" placeholder="Guess">
                 <button class="submit-btn" onclick="submitCowBull('${t.TaskID}','${t.CorrectAns}','${t.Site}')">Check</button>`;
    } else {
        html += `<input type="text" id="in-${t.TaskID}" class="quiz-opt" placeholder="Your response...">
                 <button class="submit-btn" onclick="submitManual('${t.TaskID}','${t.Site}','${t.Type}')">Send to Teacher</button>`;
    }
    div.innerHTML = html;
    return div;
}
async function renderLeaderboard() {
    const res = await fetch(`${SCRIPT_URL}?action=getLeaderboard`);
    const leaderboard = await res.json();
    
    // Check if Teacher has announced final scores
    const announceRes = await fetch(`${SCRIPT_URL}?action=checkAnnounce`);
    const announceData = await announceRes.json();
    const isFinal = announceData && announceData.announced;

    const container = document.getElementById('leaderboard-container');
    container.innerHTML = leaderboard.map((team, index) => {
        let medal = "";
        // If it's the final, add medals to the top 3
        if (isFinal) {
            if (index === 0) medal = "🥇 ";
            else if (index === 1) medal = "🥈 ";
            else if (index === 2) medal = "🥉 ";
        }

        return `
            <div class="score-row ${isFinal && index === 0 ? 'winner-glow' : ''}">
                <span>${medal}${team.name}</span>
                <span>${team.score} pts</span>
            </div>
        `;
    }).join("");
}
function unlockSite(site) {
    const val = document.getElementById(`code-${site}`).value.toUpperCase();
    const correct = challenges.find(c => c.Site === site).SiteCode.toString().toUpperCase();
    if (val === correct) { localStorage.setItem(`unlock_${site}`, "true"); renderQuests(); }
}

async function sendSubmission(payload) {
    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
    localStorage.setItem(`done_${payload.taskId}`, "true");
    renderQuests();
    setTimeout(updateScoreDisplay, 2000);
}

function submitQuiz(id, site, idx) {
    const t = challenges.find(x => x.TaskID === id);
    const container = document.querySelector(`[onclick*="${id}"]`).parentElement;
    const buttons = container.querySelectorAll('.quiz-opt');
    
    // 1. Visual Feedback: Highlight the selected button
    buttons.forEach((btn, i) => {
        btn.disabled = true; // Prevent double-clicking
        if (i === idx) {
            btn.style.background = "var(--accent)";
            btn.style.color = "white";
            btn.innerText = "Selected...";
        } else {
            btn.style.opacity = "0.5";
        }
    });

    // 2. Tiny delay so the student sees their choice
    setTimeout(() => {
        const isCorrect = (idx == t.CorrectAns);
        const pts = isCorrect ? parseInt(t.Points) : 0;
        
        if (isCorrect) {
            alert("🌟 Correct! +" + pts + " points.");
        } else {
            alert("❌ Incorrect. 0 points assigned.");
        }
        
        // 3. Send to Google Sheets
        sendSubmission({ 
            team: userTeam, 
            site: site, 
            taskId: id, 
            type: 'quiz', 
            content: `Picked: ${idx}`, 
            autoPts: pts 
        });
    }, 600); // 0.6 second delay
}

function nextClue(id, cluesStr) {
    const clues = cluesStr.split("|");
    let count = parseInt(localStorage.getItem(`clue_count_${id}`) || 1);
    if (count < clues.length) {
        count++;
        localStorage.setItem(`clue_count_${id}`, count);
        document.getElementById(`clue-text-${id}`).innerText = `Clue ${count}: ${clues[count-1]}`;
    }
}

function submitClue(id, site) {
    const t = challenges.find(x => x.TaskID === id);
    const ans = document.getElementById(`in-${id}`).value.toUpperCase().trim();
    if (ans === t.CorrectAns.toString().toUpperCase().trim()) {
        const count = parseInt(localStorage.getItem(`clue_count_${id}`) || 1);
        const pts = Math.max(parseInt(t.Points) - ((count - 1) * 5), 5);
        sendSubmission({ team: userTeam, site: site, taskId: id, type: 'clue', content: ans, autoPts: pts });
    } else { alert("Try again!"); }
}

function submitCowBull(id, target, site) {
    let attempts = parseInt(localStorage.getItem(`attempts_${id}`) || 0);
    if (attempts >= 10) return alert("No attempts left!");

    const guess = document.getElementById(`in-${id}`).value.toUpperCase().trim();
    if (guess.length !== target.length) return alert(`Word must be ${target.length} letters!`);

    attempts++;
    localStorage.setItem(`attempts_${id}`, attempts);

    let bulls = 0;
    let cows = 0;
    let targetArr = target.toUpperCase().split("");
    let guessArr = guess.split("");

    // First pass: Find Bulls (Correct position)
    for (let i = 0; i < targetArr.length; i++) {
        if (guessArr[i] === targetArr[i]) {
            bulls++;
            targetArr[i] = null; // Mark used
            guessArr[i] = null;  // Mark used
        }
    }

    // Second pass: Find Cows (Wrong position)
    for (let i = 0; i < guessArr.length; i++) {
        if (guessArr[i] !== null) {
            let index = targetArr.indexOf(guessArr[i]);
            if (index !== -1) {
                cows++;
                targetArr[index] = null;
            }
        }
    }

    const log = document.getElementById(`log-${id}`);
    log.innerHTML += `<div>${attempts}: ${guess} (${bulls}B, ${cows}C)</div>`;

    if (bulls === target.length) {
        alert("🎉 Correct! Sending score...");
        sendSubmission({ team: userTeam, site: site, taskId: id, type: 'cowbull', content: guess, autoPts: 20 });
    } else if (attempts >= 10) {
        alert("Out of attempts! 0 points.");
        sendSubmission({ team: userTeam, site: site, taskId: id, type: 'cowbull', content: "FAILED", autoPts: 0 });
    }
}

function submitManual(id, site, type) {
    const inputElement = document.getElementById(`in-${id}`);
    const val = inputElement.value.trim();

    if (val.length < 2) {
        alert("Please type a proper answer before sending!");
        return;
    }

    // Visual feedback
    const btn = event.target;
    btn.innerText = "⌛ Sending...";
    btn.disabled = true;

    sendSubmission({ 
        team: userTeam, 
        site: site, 
        taskId: id, 
        type: type, 
        content: val, 
        autoPts: 0 // Always 0 because Teacher decides the points
    }).then(() => {
        alert("🚀 Sent to Teacher HQ! Check back later for points.");
    });
}

async function updateScoreDisplay() {
    const res = await fetch(`${SCRIPT_URL}?action=getScore&team=${userTeam}`);
    document.getElementById('my-pts').innerText = await res.text();
}

function logout() { localStorage.removeItem('team'); location.reload(); }

function openAdmin() { if (prompt("Pass:") === "KARNATAKA2026") { showView('admin-view'); renderPending(); } }

async function renderPending() {
    const res = await fetch(`${SCRIPT_URL}?action=getPending`);
    const data = await res.json();
    document.getElementById('pending-list').innerHTML = data.map(i => `
        <div class="quest-card">${i.team}: ${i.content} 
        <input type="number" id="p-${i.row}" placeholder="Pts">
        <button onclick="approveTask(${i.row})">OK</button></div>`).join("");
}

async function updateLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getLeaderboard`);
        const data = await res.json();
        
        // Sort data by score descending
        data.sort((a, b) => b.score - a.score);

        container.innerHTML = data.map((item, index) => `
            <div class="score-row">
                <span>${index + 1}. ${item.team}</span>
                <span><strong>${item.score}</strong></span>
            </div>
        `).join("");
    } catch (e) {
        container.innerHTML = "<p>Leaderboard currently unavailable.</p>";
    }
}

async function approveTask(row) {
    const pts = document.getElementById(`p-${row}`).value;
    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "grade", row: row, pts: pts })});
    renderPending();
}

function resetGameForUser() { if(confirm("Clear phone?")) { localStorage.clear(); location.reload(); } }
