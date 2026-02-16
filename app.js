const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyH0ey1aVqAx2byXwg8IByOnOJUu-nJOBFGH6YXoQqNRRoAAdVswp7Rs0SbPIg7tzq9Sg/exec";

const TEAMS = {
    "Roller": { pin: "4921", drive: "LINK1" },
    "Gaja": { pin: "8374", drive: "LINK2" },
    "Kamal": { pin: "2569", drive: "LINK3" },
    "Shrigandha": { pin: "7103", drive: "LINK4" },
    "Amra": { pin: "6482", drive: "LINK5" }
};

let userTeam = localStorage.getItem('team');
let challenges = JSON.parse(localStorage.getItem('challenges') || "[]");

window.onload = () => {
    initTeams();
    if (userTeam) {
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('main-view').style.display = 'block';
        document.getElementById('score-display').style.display = 'block';
        renderQuests();
    }
};

function initTeams() {
    const grid = document.getElementById('team-selector');
    Object.keys(TEAMS).forEach(t => {
        grid.innerHTML += `<div class="team-btn" onclick="openPin('${t}')">${t}</div>`;
    });
}

async function syncData() {
    const res = await fetch(`${SCRIPT_URL}?action=sync`);
    challenges = await res.json();
    localStorage.setItem('challenges', JSON.stringify(challenges));
    renderQuests();
}

function renderQuests() {
    const cont = document.getElementById('quest-container');
    cont.innerHTML = "";
    
    // Group by Site
    const sites = [...new Set(challenges.map(c => c.Site))];
    
    sites.forEach(site => {
        const isUnlocked = localStorage.getItem(`unlock_${site}`);
        const siteHtml = document.createElement('div');
        siteHtml.className = "quest-card";
        
        if (!isUnlocked) {
            siteHtml.innerHTML = `<h3>${site}</h3>
                <input type="text" id="code-${site}" placeholder="Enter Site Code">
                <button onclick="unlockSite('${site}')">Unlock</button>`;
        } else {
            siteHtml.innerHTML = `<h3>${site}</h3>`;
            challenges.filter(c => c.Site === site).forEach(t => {
                siteHtml.appendChild(createTaskUI(t));
            });
        }
        cont.appendChild(siteHtml);
    });
}

function createTaskUI(t) {
    const div = document.createElement('div');
    const isDone = localStorage.getItem(`done_${t.TaskID}`);
    div.className = `task-item ${isDone ? 'locked-task' : ''}`;
    
    if (isDone) {
        div.innerHTML = `<p>✅ ${t.Question}</p>`;
        return div;
    }

    switch(t.Type) {
        case 'quiz':
            const opts = t.Options_Clues.split(",");
            div.innerHTML = `<p>${t.Question}</p>` + opts.map((o,i) => 
                `<button class="quiz-opt" onclick="submitQuiz('${t.TaskID}','${t.Site}',${i},${t.Answer_Pts})">${o}</button>`).join("");
            break;
        case 'clue':
            const clues = t.Options_Clues.split("|");
            div.innerHTML = `<p id="text-${t.TaskID}">${clues[0]}</p>
                <button class="clue-btn" onclick="nextClue('${t.TaskID}','${t.Options_Clues}')">Next Clue</button>
                <input type="text" id="in-${t.TaskID}" placeholder="Answer">
                <button class="submit-btn" onclick="submitClue('${t.TaskID}','${t.Site}','${t.Answer_Pts}')">Submit</button>`;
            break;
        case 'media':
            div.innerHTML = `<p>${t.Question}</p>
                <label><input type="checkbox" id="check-${t.TaskID}"> I uploaded to Drive</label>
                <button class="submit-btn" onclick="submitMedia('${t.TaskID}','${t.Site}')">Confirm</button>`;
            break;
    }
    return div;
}

// Logic for Submissions
async function postData(payload) {
    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
    localStorage.setItem(`done_${payload.taskId}`, "true");
    renderQuests();
}

function submitQuiz(id, site, val, correct) {
    const pts = (val == correct) ? 10 : 0;
    postData({ team: userTeam, site: site, taskId: id, type: 'quiz', content: val, autoPts: pts });
}

function unlockSite(site) {
    const code = document.getElementById(`code-${site}`).value;
    const match = challenges.find(c => c.Site === site).SiteCode;
    if (code === match) {
        localStorage.setItem(`unlock_${site}`, "true");
        renderQuests();
    }
    
}

// Add these variables to your app.js
let currentClues = {}; 

// --- NEW TASK TYPE: WORD PUZZLE (COW-BULL) ---
function submitWordGuess(id, targetWord, site) {
    const guess = document.getElementById(`word-in-${id}`).value.toUpperCase();
    if (guess.length !== targetWord.length) return alert(`Word must be ${targetWord.length} letters!`);

    let bulls = 0;
    let cows = 0;
    let targetArr = targetWord.split("");
    let guessArr = guess.split("");

    // Check Bulls
    for (let i = 0; i < targetArr.length; i++) {
        if (guessArr[i] === targetArr[i]) {
            bulls++;
            targetArr[i] = null;
            guessArr[i] = null;
        }
    }
    // Check Cows
    for (let i = 0; i < guessArr.length; i++) {
        if (guessArr[i] && targetArr.includes(guessArr[i])) {
            cows++;
            targetArr[targetArr.indexOf(guessArr[i])] = null;
        }
    }

    const log = document.getElementById(`log-${id}`);
    log.innerHTML += `<div>${guess}: ${bulls} Bulls, ${cows} Cows</div>`;

    if (bulls === targetWord.length) {
        alert("🎉 Correct! Word Unlocked.");
        postData({ team: userTeam, site: site, taskId: id, type: 'word', content: guess, autoPts: 25 });
    }
}

// --- NEW TASK TYPE: CLUE PROGRESSION ---
function nextClue(id, cluesString) {
    const clues = cluesString.split("|");
    if (!currentClues[id]) currentClues[id] = 1;
    
    if (currentClues[id] < clues.length) {
        currentClues[id]++;
        document.getElementById(`text-${id}`).innerText = "Clue " + currentClues[id] + ": " + clues[currentClues[id]-1];
        localStorage.setItem(`clue_used_${id}`, currentClues[id]);
    } else {
        alert("No more clues available!");
    }
}

// --- TEACHER RESET LOGIC ---
function resetGameForUser() {
    const confirmReset = confirm("CRITICAL: This will wipe ALL progress on THIS device. Points already in the Google Sheet will remain, but the student can re-submit everything. Proceed?");
    if (confirmReset) {
        localStorage.clear();
        alert("Device Reset Successful.");
        location.reload();
    }
}

// --- UPDATED TASK UI GENERATOR ---
function createTaskUI(t) {
    const div = document.createElement('div');
    const isDone = localStorage.getItem(`done_${t.TaskID}`);
    div.className = `task-item ${isDone ? 'locked-task' : ''}`;
    
    if (isDone) {
        div.innerHTML = `<p>✅ Task Completed: ${t.Question}</p>`;
        return div;
    }

    if (t.Type === 'word') {
        div.innerHTML = `
            <p><strong>Grand Challenge:</strong> Guess the ${t.Answer_Pts.length} letter word.</p>
            <div id="log-${t.TaskID}" class="puzzle-log"></div>
            <input type="text" id="word-in-${t.TaskID}" maxlength="${t.Answer_Pts.length}" placeholder="Enter guess">
            <button class="submit-btn" onclick="submitWordGuess('${t.TaskID}','${t.Answer_Pts}','${t.Site}')">Guess</button>
        `;
    } else if (t.Type === 'clue') {
        const clues = t.Options_Clues.split("|");
        div.innerHTML = `
            <p id="text-${t.TaskID}">Clue 1: ${clues[0]}</p>
            <button class="clue-btn" onclick="nextClue('${t.TaskID}','${t.Options_Clues}')">Get Next Clue</button>
            <input type="text" id="in-${t.TaskID}" placeholder="Your Answer">
            <button class="submit-btn" onclick="submitClue('${t.TaskID}','${t.Site}','${t.Answer_Pts}')">Solve</button>
        `;
    }
    // ... (Keep 'quiz' and 'media' logic from previous step)
    return div;
}
