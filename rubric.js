const store = window.localStorage;

let scores;

function fourPointLookup(completion) {

    function lower_bound(arry, val, left=0, right=arry.length) {
        while (right > left) {
            let mid = Math.floor(left + (right - left) / 2);
            if (arry[mid].cutoff <= val)
                left = mid + 1;
            else
                right = mid;
        } // while

        return left;
    }

    const index = Math.max(lower_bound(Object.values(scores), completion)-1, 0);
    return Object.values(scores)[index].score;
    
}

function populateTable() {
    Object.values(scores).forEach(function(v) {
        const selector = `#grade-${Math.round(v.score * 100).toString().padStart(3, '0')}`;
        const entry = document.querySelector(selector);
        entry.value = v.cutoff;
    });
}

function saveGrades() {
    store.setItem("scores", JSON.stringify(scores));
}

async function loadSavedOrDefaultGrades() {
    const storedScores = store.getItem("scores");
    if (storedScores) {
        scores = JSON.parse(storedScores);
    } else {
        await loadDefaultGrades();
    }
}

async function loadDefaultGrades() {
    const defaultRubric = await (await fetch("default_rubric.json")).json();
    scores = defaultRubric;
}

window.addEventListener("load", async function() {
    if(!scores) {
        await loadSavedOrDefaultGrades();
    }

    populateTable();

    Object.values(scores).forEach(function(v) {
        const selector = `#grade-${Math.round(v.score * 100).toString().padStart(3, '0')}`;
        const entry = document.querySelector(selector);
        entry.addEventListener("change", () => { 
            v.cutoff = parseFloat(entry.value); 
            saveGrades();
        });
    });

    document.querySelector("#rubricReset").addEventListener("click", async function() {
        await loadDefaultGrades();
        saveGrades();
        populateTable();
    });
});