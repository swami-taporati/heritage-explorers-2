let currentTeam = "";
let currentLevel = 0;

const levels = [
    { name: "Bannerghatta", code: "ROAR", task: "Identify 3 species and photo them." },
    { name: "Hampi", code: "STONE", task: "Find the musical pillars and record a sound." },
    // Add more levels here...
];

function selectTeam(name, icon) {
    currentTeam = name;
    localStorage.setItem("team", name);
    document.getElementById("setup").style.display = "none";
    document.getElementById("play-area").style.display = "block";
    document.getElementById("team-display").innerText = icon + " Team " + name;
}

function unlockLocation() {
    let input = document.getElementById("unlockCode").value.toUpperCase();
    if(input === levels[currentLevel].code) {
        document.getElementById("challenge-box").style.display = "block";
        document.getElementById("task-desc").innerText = levels[currentLevel].task;
    } else {
        alert("Incorrect Code! Ask your teacher.");
    }
}

// ADMIN RESET FUNCTION
function resetGame() {
    if(confirm("Teacher: Are you sure you want to wipe all testing data?")) {
        localStorage.clear();
        location.reload();
    }
}

// Enable Admin access by triple-tapping the title
document.getElementById("main-title").addEventListener('click', function (evt) {
    if (evt.detail === 3) {
        document.getElementById("admin-panel").style.display = "block";
    }
});
