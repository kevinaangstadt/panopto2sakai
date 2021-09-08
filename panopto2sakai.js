// GLOBAL for tracking 4.0 grading
let fourPoint;


// ref: http://stackoverflow.com/a/1293163/2343
// This will parse a delimited string into an array of
// arrays. The default delimiter is the comma, but this
// can be overriden in the second argument.
function CSVToArray( strData, strDelimiter ){
    // Check to see if the delimiter is defined. If not,
    // then default to comma.
    strDelimiter = (strDelimiter || ",");

    // Create a regular expression to parse the CSV values.
    var objPattern = new RegExp(
        (
            // Delimiters.
            "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

            // Quoted fields.
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

            // Standard fields.
            "([^\"\\" + strDelimiter + "\\r\\n]*))"
        ),
        "gi"
        );


    // Create an array to hold our data. Give the array
    // a default empty first row.
    var arrData = [[]];

    // Create an array to hold our individual pattern
    // matching groups.
    var arrMatches = null;


    // Keep looping over the regular expression matches
    // until we can no longer find a match.
    while (arrMatches = objPattern.exec( strData )){

        // Get the delimiter that was found.
        var strMatchedDelimiter = arrMatches[ 1 ];

        // Check to see if the given delimiter has a length
        // (is not the start of string) and if it matches
        // field delimiter. If id does not, then we know
        // that this delimiter is a row delimiter.
        if (
            strMatchedDelimiter.length &&
            strMatchedDelimiter !== strDelimiter
            ){

            // Since we have reached a new row of data,
            // add an empty row to our data array.
            arrData.push( [] );

        }

        var strMatchedValue;

        // Now that we have our delimiter out of the way,
        // let's check to see which kind of value we
        // captured (quoted or unquoted).
        if (arrMatches[ 2 ]){

            // We found a quoted value. When we capture
            // this value, unescape any double quotes.
            strMatchedValue = arrMatches[ 2 ].replace(
                new RegExp( "\"\"", "g" ),
                "\""
                );

        } else {

            // We found a non-quoted value.
            strMatchedValue = arrMatches[ 3 ];

        }


        // Now that we have our value string, let's add
        // it to the data array.
        arrData[ arrData.length - 1 ].push( strMatchedValue );
    }

    // Return the parsed data.
    return( arrData );
}

/**
 * Figure out all of the unique vidoes in the data file
 * We use the session name first, but if they are not unique,
 * we add things until they are
 * @param {array[array[data]]} dataPoints 
 */
function extractAssignments(dataPoints) {
    const find_dupes = function(arry) {
        // check if any names are identical
        return arry.filter(function(e) {
            return assignments.some(function(a) {
                if (e === a) {
                    return false;
                }
                if (e.display === a.display) {
                    return true;
                }
                else return false;
            })
        });
    }

    const assignments = dataPoints.map(function(e) {
        // use the session ID as a key
        return {
            key: e[3],
            folder: e[0],
            name: e[2],
            display: e[2]
        }
    }).filter(function(e,i,a) {
        return i === a.findIndex((e2) => {
            return e.key === e2.key
        });
    });

    find_dupes(assignments).forEach(function(e) {
        e.display = `${e.folder} - ${e.name}`;
    });

    if (find_dupes(assignments).length !== 0) {
        throw "Could not generate unique gradebook values";
    }
    
    
    return assignments.reduce(function(map, e) {
        // use the session ID as a key
        map[e.key] = e;
        return map;
    }, {});
}

function parsePanopto(data) {
    const csv = CSVToArray(data);

    if (csv.length < 2) {
        throw "CSV needs at least two lines of data";
    }

    const header = csv[0];
    if (header[0] !== "Folder Name" && header[1] !== "Folder ID" && header[2] !== "Session Name" && header[3] !== "Session ID") {
        throw `Unrecognized format. The initial header items were ${header.slice(0,4)}`
    }

    if (header.length !== 14) {
        throw `Unxexpected number of columns in file`;
    }

    const dataRows = csv.slice(1).filter(r=>r.length === header.length);
    const assignments = extractAssignments(dataRows);

    const gradeData = {};
    
    // go through each data point
    // this is raw data so we have to build up student
    dataRows.forEach( function(item) {
        const email = item[7];

        if (!(email in gradeData)) {
            gradeData[email] = {
                id: email.substring(0, email.lastIndexOf("@")),
                name: item[6]
            }
            Object.keys(assignments).forEach(e => gradeData[email][e] = 0);
        } 
        const videoId = item[3];
        gradeData[email][videoId] = parseFloat(item[11]);
    });

    return {
        assignments: assignments,
        grades: gradeData
    };
}

function generateAssignments(assignments, grades) {
    const container = document.getElementById('output');

    // instructions
    const instructions = document.createElement('div');
    instructions.innerHTML = `
    <p>
        Select the videos you wish to convert and enter the maximum score possible on Panopto
        for each assignment you wish to convert (if not using a Four Point scale).  
        This value will depend on how you configured your assignments.  Note that 
        you can also enter the same max score using the box in the header. 
    </p>
    <p>
        Use the Four Point toggle to select the grading scheme.  With this toggle on, all assignments
        will be converted to the 4.0 grading scale.  With this toggle off, the number of points
        will transfer directly from Perusall.
    </p>
    `;
    container.appendChild(instructions);

    // assignments
    const assignmentsDiv = document.createElement('div');

    const template = document.getElementById('assignment-template');


    // all check boxes
    Object.values(assignments).forEach(function(a, id) {
        const clone = template.content.cloneNode(true);

        const check = clone.querySelector('.checkbox')
        check.id = `assignment-${id}`;

        const label = clone.querySelector('label');
        label.for = `assignment-${id}`;
        label.innerText = a.display;
        label.dataset.key = a.key;

        const score = clone.querySelector('.score');

        check.addEventListener("change", function() {
            score.disabled = !check.checked;
        });

        assignmentsDiv.appendChild(clone);

    });

    // make "check all"
    const checkAll = template.content.cloneNode(true);
    checkAll.firstElementChild.classList.add("border-bottom");
    checkAll.firstElementChild.classList.add("pb-3");
    const box = checkAll.querySelector('.checkbox');
    box.id = `assignment-select-all`;

    const label = checkAll.querySelector('label');
    label.for = `assignment-elect-all`;
    label.innerText = "Select All";

    allScore = checkAll.querySelector('.score');
    allScore.disabled = false;
    allScore.placeholder = "Max Score";

    // Todo check for valid numbers
    allScore.addEventListener("input", function(){
        const val = allScore.value;
        assignmentsDiv.querySelectorAll('.score').forEach(function(e){ e.value = val; });
    });

    assignmentsDiv.querySelectorAll('.score').forEach(function(e){
        e.addEventListener("input", function(){
            allScore.value = "";
        });
    });

    box.addEventListener("change", function() {
        assignmentsDiv.querySelectorAll('.checkbox').forEach(function(i){
            i.checked = box.checked;
        });
    });

    assignmentsDiv.querySelectorAll('.checkbox').forEach(function(i){
        i.addEventListener("change", function() {
            const nodes = Array.from(assignmentsDiv.querySelectorAll('.checkbox'));
            // check to see if all checked or all not checked
            if (nodes.every(function(el){return el.checked})) {
                box.checked = true;
                box.indeterminate = false;
            } else if (nodes.every(function(el){return !el.checked})) {
                box.checked = false;
                box.indeterminate = false;
            } else {
                box.indeterminate = true;
            }
        })
    });

    container.appendChild(checkAll);
    container.appendChild(assignmentsDiv);

    // add a submit button
    const submit = document.createElement('a');
    submit.classList.add("btn");
    submit.classList.add("btn-primary")
    submit.innerText = "Generate Sakai Grades"

    submit.addEventListener("click", function() {
        // get all things checked
        const assignmentsToConvert = Array.from(assignmentsDiv.children).filter(function(e) {
            return e.querySelector('.checkbox').checked;
        });

        const assignments = assignmentsToConvert.map(function(node) {
            return {
                key: node.querySelector('label').dataset.key,
                name: node.querySelector('label').innerText,
                total: parseFloat(node.querySelector('.score').value)
            }
        });

        const data = generateSakaiCSV(assignments, grades);

        var downloadLink = document.createElement('a');
        downloadLink.setAttribute('href', 'data:application/octet-stream,' + encodeURIComponent(data));
        downloadLink.setAttribute('download', `Panopto_Grades_${new Date().toISOString()}.csv`);

        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);

        downloadLink.click();

        document.body.removeChild(downloadLink);
    })

    container.appendChild(submit);
}

function generateSakaiCSV(assignments, grades) {
    // make the header
    const sk_assignments = assignments.reduce(function(list, a) {
        if (fourPoint){
            // point value will always be 4 in this case
            list.push(`"${a.name}[4]"`);
        } else {
            list.push(`"${a.name}[${a.total}]"`);
        }

        // comment
        list.push(`"* ${a.name}"`);

        return list;
    }, []);
    const header = `"Student ID","Name",${sk_assignments.join()}`;

    // make the grades
    const entries = Object.values(grades).map(function(grade) {
        const grades = assignments.reduce(function(list, a) {
            const completion = grade[a.key];

            if (fourPoint) {
                // look up in table
                list.push(`"${fourPointLookup(completion)}"`);
            } else {
                const score = completion / 100 * a.total;
                list.push(`"${score}"`);
            } 

            list.push(`${completion}% viewed`);
            return list;
        }, []);

        return `"${grade.id}","${grade.name}",${grades.join()}`;
    });

    return `${header}\n${entries.join("\n")}`;
}

window.addEventListener("load", function() {
    // fourpoint grading?
    const useFourPoint = document.querySelector("#useFourPoint")
    fourPoint = useFourPoint.checked;
    useFourPoint.addEventListener("change", function() {
        fourPoint = useFourPoint.checked;
    });

    const inputElement = document.querySelector("#formFile");

    inputElement.addEventListener("change", async function() {
        const completion = parsePanopto(await inputElement.files[0].text());
        generateAssignments(completion.assignments, completion.grades);
    })
});