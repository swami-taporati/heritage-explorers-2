const SCRIPT_URL_GIRLS_BATCH = "https://script.google.com/macros/s/AKfycbwQ3pToy_PjP3v_2dmCCudwl4jtgfDiPPpnWS5O72KelxlHpBKCH9kkGPTgko_nqYQtkw/exec";
const SCRIPT_URL_BOYS_BATCH = "https://script.google.com/macros/s/AKfycbztZ6oI3VGb6TWguyDbu8DNsC7TQprZ3NPNwSNZvAegdMaMuD3p0t4bp176hxfw_2-J/exec";

const TEAMS_GIRLS = {
    "Neelakanta": { pin: "4921", folder: "https://drive.google.com/drive/folders/1Awv_3NvjvPhbnYXyZ-iELT3RA-SZdOBy?usp=drive_link" },
    "Gaja": { pin: "8374", folder: "https://drive.google.com/drive/folders/17FiZFV9g_5xfys1Parn8ZSD50aozR9l5?usp=drive_link" },
    "Kamala": { pin: "2569", folder: "https://drive.google.com/drive/folders/1O4N5IMxpN25aXuK33A608KxFGcixT3WE?usp=drive_link" },
    "Srigandha": { pin: "7103", folder: "https://drive.google.com/drive/folders/1-qX4XPk6XCogJK9Wg13gfBeMFFtTMcdB?usp=drive_link" },
    "Mavina": { pin: "6482", folder: "https://drive.google.com/drive/folders/1a15Jo6htUwOtEhaYZrd_hSOQXm6Sp0bl?usp=drive_link" },
    "Chitte": { pin: "5050", folder: "https://drive.google.com/drive/folders/166-J6CQcoo5Qsaj68Z3IXC7WbWN-btK7?usp=drive_link" }
};

const TEAMS_BOYS = {
    "Neelakanta": { pin: "4921", folder: "https://drive.google.com/drive/folders/1q0AlFqp9h-A13SwzvVwcexmGWbZgZNAR?usp=sharing" },
    "Gaja": { pin: "8374", folder: "https://drive.google.com/drive/folders/1ljz1KFdHDEAEkOkzuqyR5F4AHuFm4hd6?usp=sharing" },
    "Srigandha": { pin: "7103", folder: "https://drive.google.com/drive/folders/1MKPBjx09k93_LFmk2Htlscgctf1RWeJe?usp=sharing" }
}

let userTeam = localStorage.getItem('team');
let challenges = JSON.parse(localStorage.getItem('challenges') || "[]");
let selectedTeamTemp = "";

const APP_TITLE = "Heritage Explorer";

let SCRIPT_URL = SCRIPT_URL_GIRLS_BATCH;
let TEAMS = TEAMS_GIRLS;

window.onload = () => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const batch = urlParams.get('batch');

    if (batch === "boys") {
        SCRIPT_URL = SCRIPT_URL_BOYS_BATCH;
        TEAMS = TEAMS_BOYS;
    }
    initTeams();
    if (userTeam) {
        showView('main-view');
        const banner = document.getElementById('active-team-banner');
        if(banner) banner.innerText = `Team: ${userTeam}`;
        renderQuests();
        updateScoreDisplay();
        updateLeaderboard();
        
        // Hide the winner overlay just in case it was left open
        document.getElementById('winner-overlay').style.display = 'none';
    }
};

function showView(id) {
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(id);
    if(target) target.style.display = 'block';
}

function goBack() { renderQuests(); window.scrollTo(0, 0); }

function initTeams() {
    const grid = document.getElementById('team-selector');
    if(!grid) return;
    grid.innerHTML = "";
    Object.keys(TEAMS).forEach(t => {
        const btn = document.createElement('div');
        btn.className = "team-btn";
        btn.innerHTML = `<img src="./images/${t}.png" class="team-icon" onerror="this.src='https://img.icons8.com/color/96/group.png'"><div class="team-label">${t}</div>`;
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
        await handleSubmittedTasks();
        renderQuests();
        if(btn) btn.innerText = "✅ Sync Done";
    } catch (e) { alert("Sync failed"); }
    setTimeout(() => { if(btn) btn.innerText = "🔄 Sync Challenges"; }, 2000);
}

async function handleSubmittedTasks() {
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getSubmittedTasks&team=${userTeam}`);
        const data = await res.json();

        if (data.length === 0) {
            return;
        }
        data.forEach (entry => {
            localStorage.setItem(`done_${entry.taskId}`, "true");
        });
    } catch(e) {}
}

function renderQuests() {
    const cont = document.getElementById('quest-container');
    if(!cont) return;
    cont.innerHTML = "";
    
    // FIX: Filter out any challenges where SiteCode is missing or empty
    const validChallenges = challenges.filter(c => c.SiteCode && c.SiteCode.toString().trim() !== "");

    if (validChallenges.length === 0) {
        cont.innerHTML = "<p style='text-align:center; padding:20px;'>No challenges found. Please Sync.</p>";
        return;
    }

    const sites = [...new Set(validChallenges.map(c => c.Site))];

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
            validChallenges.filter(c => c.Site === site).forEach(t => {
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

    let points = t.Points;
    if (t.Type === 'clue') {
        let count = parseInt(localStorage.getItem(`clue_count_${t.TaskID}`) || 1);
        points -= ((count - 1)*5);
    }

    let html = `<p><strong>${t.Type.toUpperCase()}:</strong> ${t.Question} (${points} Pts)</p>`;
    
    if (t.Type === 'quiz') {
        const opts = t.Options_Clues.split(",");
        html += `<div class="btn-group" style="display:flex; flex-direction:column; gap:8px;">`;
        opts.forEach((o, i) => {
            html += `<button class="quiz-opt" onclick="submitQuiz('${t.TaskID}','${t.Site}',${i}, event)">${o.trim()}</button>`;
        });
        html += `</div>`;
    } 
    else if (t.Type === 'clue') {
        const clues = t.Options_Clues.split("|");
        let count = parseInt(localStorage.getItem(`clue_count_${t.TaskID}`) || 1);
        for(let i=0; i<clues.length; i++) {
            if( i < count ) {
                html += `
                    <p id="clue-text-${t.TaskID}-${i}" class="clue-display">Clue ${i+1}: ${clues[i]}</p>
                `;
            } else {
                html += `
                    <p hidden id="clue-text-${t.TaskID}-${i}" class="clue-display">Clue ${i+1}: ${clues[i]}</p>
                `;
            }
        }
        if(count < clues.length) {
            html += `
                <button class="clue-btn" onclick="nextClue('${t.TaskID}','${t.Options_Clues}')">Next Clue (-5 pts)</button>
                `;
        } else {
            html += `
                <button disabled="true" class="clue-btn")">No More Clues</button>
                `;
        }
        html += `
            <input type="text" id="in-${t.TaskID}" class="quiz-opt" placeholder="Answer...">
            <button class="submit-btn" onclick="submitClue('${t.TaskID}','${t.Site}')">Submit</button>
        `;
    } 
    else if (t.Type === 'cowbull') {
        const cbContainer = document.createElement("div");
        cbContainer.id = "CBContainer-" + t.TaskID;
        const pastGuesses = localStorage.getItem(t.TaskID + "_Guesses");
        if (pastGuesses !== null) {
            const pastGuessesArr = pastGuesses.split("|");
            pastGuessesArr.forEach( guess => {                
                let tArr = t.CorrectAns.toUpperCase().split(""), gArr = guess.split("");
                let origGuessArr = guess.split("");
                let resultArr = [...Array(tArr.length)].fill('x');
                // for(let i=0; i<tArr.length; i++) if(gArr[i]===tArr[i]) { b++; tArr[i]=null; gArr[i]=null; resultArr[i] = "b"}
                // for(let i=0; i<gArr.length; i++) if(gArr[i] && tArr.indexOf(gArr[i])!==-1) { c++; tArr[tArr.indexOf(gArr[i])]=null; resultArr[i] = "c" }
                // cbContainer.appendChild(createCBRow(origGuessArr, resultArr));
            });
        }
        const cbContainerHTML = cbContainer.outerHTML;
        //const ui = createWordleBoard(10, t.CorrectAns.length);
        html += `
            <div id="log-${t.TaskID}" class="puzzle-log">Target: ${t.CorrectAns.length} letters</div>
            ${cbContainerHTML}
            <input type="text" id="in-${t.TaskID}" class="quiz-opt" placeholder="Guess...">
            <button class="submit-btn" onclick="submitCowBull('${t.TaskID}','${t.CorrectAns}','${t.Site}')">Check</button>
        `;
    } 
    else if (t.Type === 'media') {
        const folder = TEAMS[userTeam].folder;
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
    if (val === siteData.SiteCode.toString().toUpperCase().trim()) {
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

function submitQuiz(id, site, idx, event) {
    const t = challenges.find(x => x.TaskID === id);
    const isCorrect = (idx == t.CorrectAns);
    
    // FIX: Visual Feedback for quiz selection
    const buttons = event.target.parentElement.querySelectorAll('.quiz-opt');
    buttons.forEach(b => { b.style.opacity = "0.5"; b.disabled = true; });
    event.target.style.opacity = "1";
    event.target.style.background = isCorrect ? "#27ae60" : "#e74c3c";
    event.target.style.color = "white";

    sendSubmission({ team: userTeam, site: site, taskId: id, type: 'quiz', content: `Idx: ${idx}`, autoPts: isCorrect ? parseInt(t.Points) : 0 });
    alert(isCorrect ? "🌟 Correct!" : "❌ Incorrect.");
}

function nextClue(id, cluesStr) {
    const clues = cluesStr.split("|");
    let count = parseInt(localStorage.getItem(`clue_count_${id}`) || 1);
    if (count < clues.length) {
        count++;
        localStorage.setItem(`clue_count_${id}`, count);
        renderQuests();
    }
}

function submitClue(id, site) {
    const t = challenges.find(x => x.TaskID === id);
    const ans = document.getElementById(`in-${id}`).value.toUpperCase().trim();
    let count = parseInt(localStorage.getItem(`clue_count_${id}`) || 1);
    if (ans === t.CorrectAns.toString().toUpperCase().trim()) {
        let finalPts = Math.max(parseInt(t.Points) - ((count - 1) * 5), 5);
        sendSubmission({ team: userTeam, site: site, taskId: id, type: 'clue', content: ans, autoPts: finalPts });
        alert(`Correct! Points: ${finalPts}`);
    } else {
        const clues = t.Options_Clues.split("|");
        if (count < clues.length) {
            count++;
            localStorage.setItem(`clue_count_${id}`, count);
            renderQuests();
            alert("Incorrect: Next clue will be revealed");
        } else {
            alert("Incorrect: Try again");
        }        
    }
}

function submitCowBull(id, target, site) {
    const guess = document.getElementById(`in-${id}`).value.toUpperCase().trim();
    if (guess.length !== target.length) return alert(`Need ${target.length} letters`);
    let b = 0, c = 0;
    let tArr = target.toUpperCase().split(""), gArr = guess.split("");
    let origGuessArr = guess.split("");
    let resultArr = [...Array(tArr.length)].fill('x');
    for(let i=0; i<tArr.length; i++) if(gArr[i]===tArr[i]) { b++; tArr[i]=null; gArr[i]=null; resultArr[i] = "b"}
    for(let i=0; i<gArr.length; i++) if(gArr[i] && tArr.indexOf(gArr[i])!==-1) { c++; tArr[tArr.indexOf(gArr[i])]=null; resultArr[i] = "c" }
    //document.getElementById(`log-${id}`).innerHTML += `<div>${guess}: ${b}B, ${c}C : ${resultArr}</div>`;
    document.getElementById(`CBContainer-${id}`).appendChild(createCBRow(origGuessArr, resultArr));
    if (b === target.length) {
        sendSubmission({ team: userTeam, site: site, taskId: id, type: 'cowbull', content: guess, autoPts: 20 });
        alert("🎉 Correct!");
    } else {
        let guesses = localStorage.getItem(`${id}_Guesses`);
        if(guesses === null) {
            guesses = guess;
        } else {
            guesses += `|${guess}`;
        }
        localStorage.setItem(`${id}_Guesses`, guesses);
    }
}

function createCBRow(guessArr, resultArr) {
    const length = resultArr.length;
    const row = document.createElement("div");     
    row.className = "row"; 
    row.style.gridTemplateColumns = `repeat(${length}, 25px)`
    for (let c = 0; c < length; c++) { 
        const tile = document.createElement("div"); 
        if(resultArr[c] === "b") {
            tile.className = "tile-correct"; 
        } else if (resultArr[c] === "c")  {
            tile.className = "tile-present"; 
        } else {
            tile.className = "tile-absent"; 
        }
        const textNode = document.createTextNode(guessArr[c]);
        tile.appendChild(textNode);     
        row.appendChild(tile); 
    } 
    return row; 
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
        document.getElementById('my-pts').innerText = pts;
    } catch(e) {}
}

async function updateLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getLeaderboard`);
        const data = await res.json();
        
        // item.team and item.score must match the keys in Code.gs
        container.innerHTML = data.map((item, index) => `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span>${index + 1}. ${item.team}</span>
                <strong>${item.score} pts</strong>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = "Leaderboard currently unavailable";
    }
}

async function triggerFinalReveal() {
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getLeaderboard`);
        const data = await res.json();
        data.sort((a, b) => b.score - a.score);
        document.getElementById('winner-team-name').innerText = data[0].team;
        document.getElementById('winner-score').innerText = `With ${data[0].score} Points!`;
        document.getElementById('winner-overlay').style.display = 'flex';
    } catch (e) { alert("Check internet"); }
}

function logout() { localStorage.removeItem('team'); location.reload(); }
function openAdmin() {
    const pass = prompt("Enter Teacher HQ Password:");
    if (pass === null) return; 

    if (pass === "KARNATAKA2026") {
        showView('admin-view');
        renderPending();
        updateAdminLeaderboard(); 
    } else {
        alert("❌ Access Denied: Incorrect Password");
    }
}

async function renderPending() {
    const list = document.getElementById('pending-list');
    list.innerHTML = "<p style='text-align:center;'>⏳ Fetching submissions...</p>";
    
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getPending`);
        const data = await res.json();
        
        if (data.length === 0) {
            list.innerHTML = "<p style='text-align:center; padding:20px;'>🎉 No pending approvals!</p>";
            return;
        }

        list.innerHTML = data.map(i => `
            <div class="quest-card" id="row-${i.row}" style="border-left: 5px solid gold;">
                <p><strong>Team:</strong> ${i.team} | <strong>Task:</strong> ${i.taskId}</p>
                <p style="background: #f0f0f0; padding: 8px; border-radius: 4px;">"${i.content}"</p>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="number" id="p-${i.row}" placeholder="Pts" style="width:70px; margin:0;">
                    <button id="btn-${i.row}" onclick="approveTask(${i.row})" class="submit-btn" style="margin:0; background: #27ae60;">Approve</button>
                </div>
            </div>`).join("");
    } catch (e) {
        list.innerHTML = "<p>Error loading pending tasks. Check internet.</p>";
    }
}

// Function to specifically update the leaderboard inside Teacher HQ
async function updateAdminLeaderboard() {
    const container = document.getElementById('admin-leaderboard-container');
    if(!container) return;
    
    container.innerHTML = "⏳ Updating...";
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getLeaderboard`);
        const data = await res.json();
        data.sort((a, b) => b.score - a.score);
        
        container.innerHTML = data.map((item, index) => `
            <div style="display:flex; justify-content:space-between; padding: 5px 0; border-bottom: 1px solid #eee;">
                <span>${index + 1}. ${item.team}</span>
                <strong>${item.score} pts</strong>
            </div>
        `).join("");
    } catch (e) {
        container.innerHTML = "⚠️ Error loading scores.";
    }
}
async function approveTask(row) {
    const pts = document.getElementById(`p-${row}`).value;
    const btn = document.getElementById(`btn-${row}`);
    const card = document.getElementById(`row-${row}`);

    if (!pts) return alert("Please enter points first!");

    // INSTANT FEEDBACK
    btn.innerText = "⏳ Sending...";
    btn.style.background = "#95a5a6";
    btn.disabled = true;

    try {
        await fetch(SCRIPT_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify({ action: "grade", row: row, pts: pts }) 
        });
        
        // SUCCESS FEEDBACK
        card.style.transition = "0.5s";
        card.style.opacity = "0.3";
        card.style.transform = "translateX(100%)";
        
        setTimeout(() => {
            card.remove();
            if (document.querySelectorAll('.admin-list .quest-card').length === 0) {
                renderPending(); // Refresh to show "No pending approvals"
            }
        }, 500);
    } catch (e) {
        alert("Failed to approve. Try again.");
        btn.innerText = "Approve";
        btn.style.background = "#27ae60";
        btn.disabled = false;
    }
}

// Global Reset Function for Teacher HQ
async function triggerGlobalReset() {
    if (!confirm("🚨 WARNING: This will delete ALL student submissions from the Google Sheet. Use only for practice runs!")) return;
    if (prompt("Type 'RESET' to confirm:") !== "RESET") return;

    try {
        const res = await fetch(`${SCRIPT_URL}?action=resetGame`);
        const msg = await res.text();
        alert(msg);
        location.reload();
    } catch (e) {
        alert("Reset failed. Check Script permissions.");
    }
}
function resetGameForUser() { if(confirm("Clear local device?")) { localStorage.clear(); location.reload(); } }
