/**
 * Dean Yockey 5/26/2026
 * This file is all about using the GitHub API
 */

import { Octokit, App } from "octokit";
import { Buffer } from "buffer";

let octokit = new Octokit();

let username = "";

// where to find the repo
const gh_owner = "CWU-VKD-LAB";
const gh_repo = "CWU-AI-VKD-Website"

// shas for files loaded, so we can update them
let gh_shas = {};
let gh_source_jsons = {};
let gh_source_modified = {};

// the indexes of these should correspond to paths below
let sourceTypes = [
    "article",
    "paper",
    "software",
    "other"
]

let sourcePaths = [
    "sources/articles.json",
    "sources/software.json",
    "sources/books.json",
    "sources/other.json" // anything else
];

let sourceTypeToPath = {};
sourceTypeToPath["article"] = "sources/articles.json";
sourceTypeToPath["paper"] = "sources/articles.json";
sourceTypeToPath["software"] = "sources/software.json";
sourceTypeToPath["other"] = "sources/other.json";

// Login
export async function ghAuth(authToken) {
    username = "";

    // Re-instantiate Octokit with the user's token
    octokit = new Octokit({ auth: authToken });

    try {
        // Test authentication
        const { data } = await octokit.request('GET /user');
        username = data.login; // set username
        console.log(`Successfully logged in as ${username}.`);
        return true;
      
    }
    catch (error) {
        if (error.status === 401) {
            console.log("Invalid token.");
        } else {
            console.log(`Login failure. Error status ${error.status}.`);
        }
        return false;
    }

}

// get source files
async function ghGetJSON(path) {
    console.log(`ghGetJSon(${path})`);
    
    // API request
    let result = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: gh_owner,
        repo: gh_repo,
        path: path,
    })
    
    let sha = result.data.sha;

    gh_shas[path] = sha;

    // Decode Base64 content to text
    let decodedContent = atob(result.data.content);
    
    // Parse the text as JSON
    let json = JSON.parse(decodedContent);

    gh_source_jsons[path] = json;
    gh_source_modified[path] = false;
    
    return json;
}

// upload a file to the repo
async function ghUploadJSON(object, path) {
    // you can't upload if you're not logged in
    if(!username) {
        console.log("User must authenticate with GitHub personal access token to upload data.");
        return false;
    }

    const content = Buffer.from(JSON.stringify(object, null, "\t")).toString("base64");
    const fileContent = await octokit.rest.repos.createOrUpdateFileContents({
        owner: gh_owner,
        repo: gh_repo,
        path: path,
        branch: "main",
        sha: gh_shas[path],
        message: `Update file ${path} via API.`,
        content,
    });

    const { commit: { html_url } } = fileContent.data;

    console.log(`File ${path} updated. See changes at ${html_url}.`);

    return true;
}

// getting all sources
export async function ghGetSourceJSONs() {
    let objects = [];
    let promises = [];
    for(let i = 0; i < sourcePaths.length; i ++) {
        let promise = ghGetJSON(sourcePaths[i]);
        promises.push(promise);
    }

    const results = await Promise.allSettled(promises);

    for(let i = 0; i < sourcePaths.length; i ++) {
        let sourceObjects = results[i].value;
        objects = objects.concat(sourceObjects);
        console.log(sourceObjects);
    }

    return objects;
}

// upload all modified files
export async function ghUploadModifed() {
    let failure = false;
    for(const [key, value] of Object.entries(gh_source_jsons)) {
        if(gh_source_modified[key]) {
            let status = ghUploadJSON(value, key);
            if(!status)
                failure = true;
            gh_source_modified[key] = false;
        }
    }

    return failure;
}

// add a new source to a file
export function ghAddSource(sourceFilePath, object) {
    // add object to end of the array
    gh_source_jsons[sourceFilePath].push(object);
    // this file has been modified
    gh_source_modified[sourceFilePath] = true;
}

const info_container = document.getElementById("info-container");
const header = document.getElementById("header-info");

// the button for adding a source
const row = document.createElement("div");
row.className = "button-row";

// login button
const loginButton = document.createElement("button");
loginButton.textContent = "Login";

loginButton.addEventListener("click", () => {
    ghLoginForm();
});

row.appendChild(loginButton);
header.appendChild(row);

// add source button
const addSourceButton = document.createElement("button");
addSourceButton.textContent = "Add source";

addSourceButton.addEventListener("click", () => {
    ghAddSourceForm();
});

row.appendChild(addSourceButton);
header.appendChild(row);

// upload button
const uploadButton = document.createElement("button");
uploadButton.textContent = "Upload changes";
uploadButton.className = "firstUploadButton";
uploadButton.style.display = "none";

uploadButton.addEventListener("click", () => {
    ghUploadForm();
});

const display_container = document.getElementById("display-container");
row.appendChild(uploadButton);
info_container.appendChild(uploadButton);


// what fields we can edit
const sourceFormFields = [
    // a dropdown list from sourceTypes,
    // determines what file to add to, for
    {
        id : "typeSelector",
        label : "Source type",
        element : "select",
        innerHTML :
            `
            <option value="software">Software</option>
            <option value="article">Article</option>
            <option value="paper">Paper</option>
            <option value="book">Book</option>
            <option value="other">Other</option>
            `,
        jsonkey : "form",
        required : true,
    },
    // Link field
    {
        id : "linkField",
        label : "Link",
        element : "input",
        type : "text",
        jsonkey : "link",
        // not all papers have a link :(
        //required : true,
    },
    // Title field
    {
        id : "titleField",
        label : "Title",
        element : "input",
        type : "text",
        jsonkey : "title",
        required : "true"
    },
    // Date field
    {
        id : "dateField",
        label : "Date",
        element : "input",
        type : "date",
        jsonkey : "date",
        jsontype : "date"
    },
    // Authors field (list, maybe comma seperated or something?)
    {
        id : "authorField",
        label : "Authors",
        element : "input",
        type : "text",
        jsonkey : "authors",
        jsontype : "array",
        required : true,
    },  // would like something nicer than just a normal textox, maybe using horsey or something?
        // but this is a placeholder for now I guess

    // Topics field (list like above)
    {
        id : "topicsField",
        label : "Topics",
        element : "input",
        type : "text",
        jsonkey : "topics",
        jsontype : "array"
    },

    // can I make these only appear based on what the type is?
    // ISBN
    {
        id : "isbnField",
        label : "ISBN",
        element : "input",
        type : "text",
        jsonkey : "isbn",
        visibleon : ["book", "other"]
    },

    // DOI
    {
        id : "doiField",
        label : "DOI",
        element : "input",
        type : "text",
        jsonkey : "doi",
        visibleon : ["book", "article", "paper", "other"]
    },

    // Publisher
    {
        id : "publisherField",
        label : "Publisher",
        element : "input",
        type : "text",
        jsonkey : "publisher",
        visibleon : ["book", "article", "paper", "other"]
    },

    // Cites field (list)
    {
        id : "citesField",
        label : "Cites",
        element : "input",
        type : "text",
        jsonkey : "cites",
        jsontype : "array"
    },

    // Summary field (big text box)
    // 5 rows or something?
    // textarea element
    {
        id : "summaryField",
        label : "Summary",
        element : "textarea",
        jsonkey : "summary",
        required : true,
    },
];

// create GUI form to enter data
// source is null for new source I guess
// if source is an existing source, pre-fill stuff
export function ghAddSourceForm(source) {

    let type = null;
    let typeSelector = document.getElementById("typeSelector");
    if(typeSelector) {
        type = typeSelector.value;
    }

    if(source) {
        type = source.form;
    }

    // title
    info_container.innerHTML = "<div><strong>Add/edit source</strong></div>";

    if(!username) {
        info_container.innerHTML +=
        `<div>You must be logged in to add or edit a source.</div>`;
        return false;
    }

    // fields
    for(let i = 0; i < sourceFormFields.length; i ++) {
        const field = sourceFormFields[i];

        // skip if not visible for this type
        if(type && ("visibleon" in field) && !field.visibleon.includes(type)) {
            continue;
        }

        const row = document.createElement("div");
        row.className = "field-row";

        // label
        if("label" in field) {
            const label = document.createElement("label");
            label.setAttribute("for", field.id);
            let text = field.label;
            if("required" in field && field.required)
                text += "<span class='required'>*</span>";
            text += ": ";
            label.innerHTML = text;
            row.appendChild(label);
        }

        const fieldElement = document.createElement(field.element);
        fieldElement.id = field.id;
        if("innerHTML" in field) {
            fieldElement.innerHTML = field.innerHTML;
        }
        if("type" in field) {
            fieldElement.setAttribute("type", field.type);
        }

        // pre-fill
        if(source) {
            if(!(field.jsonkey in source)) {
                fieldElement.value = "";
            }
            else if("jsontype" in field && field.jsontype == "array") {
                fieldElement.value = source[field.jsonkey].join(", ");
            }
            else if("jsontype" in field && field.jsontype == "date") {
                fieldElement.value = new Date(source[field.jsonkey]).toISOString().split('T')[0].slice(0, 10);
            }
            else {
                fieldElement.value = source[field.jsonkey];
            }
        }

        row.appendChild(fieldElement);
        info_container.appendChild(row);
    }

    typeSelector = document.getElementById("typeSelector");
    typeSelector.addEventListener("change", () => { ghAddSourceForm(null) });
    typeSelector.value = type;

    // submit button
    const row = document.createElement("div");
    row.className = "button-row";

    //adds button to div
    const addSourceButton = document.createElement("button");
    addSourceButton.textContent = "Submit source";

    addSourceButton.addEventListener("click", ghSubmitAddSourceForm);

    row.appendChild(addSourceButton);
    info_container.appendChild(row);
}

// create GUI form to login
function ghLoginForm() {
    let userDisplay = username;
    if(!username)
        userDisplay = "[NONE]"
    // title
    info_container.innerHTML = 
        `<div><strong>Login</strong></div>
        <div>Username: <span id="username">${userDisplay}</span></div>
        <div>
            <label for="ghtoken">Github personal access token:</label>
            <input type="password" name="ghtoken" id="ghtoken" placeholder="Enter GitHub Token">
        </div>
        <div><button id="authButton">Authenticate</button></div>
        <div><pre id="output"></pre></div>`;

    document.getElementById("ghtoken").value = "";
    document.getElementById("authButton").addEventListener("click", clickAuthButton);
}

async function clickAuthButton() {
    const authToken = document.getElementById("ghtoken").value;
    const output = document.getElementById("output");
    const usernameField = document.getElementById("username");
    const success = await ghAuth(authToken);
    if(!authToken) {
        output.textContent = "Please enter a token.";
        usernameField.textContent = "[NONE]"
        return;
    }
    if(success) {
        output.textContent = `Logged in as: ${username}`;
        usernameField.textContent = username;
    }
    else {
        output.textContent = `Login failed`;
        usernameField.textContent = "[NONE]";
    }
}

function ghSubmitAddSourceForm() {
    
    const typeSelector = document.getElementById("typeSelector");
    const type = typeSelector.value;

    const jsonobj = {};
    let failed = false;
    
    // fields
    for(let i = 0; i < sourceFormFields.length; i ++) {
        const field = sourceFormFields[i];
        
        // skip if not visible for this type
        if(type && ("visibleon" in field) && !field.visibleon.includes(type)) {
            console.log(`${field.jsonkey} not visible in ${type}.`);
            continue;
        }

        const element = document.getElementById(field.id);

        if(!failed && "required" in field && field.required && !element.value) {
            alert("Please fill out all required fields.");
            failed = true;
        }

        else if(element.value) {
            if("jsontype" in field && field.jsontype == "array") {
                jsonobj[field.jsonkey] = element.value.split(",").map(item => item.trim());
                if(!jsonobj[field.jsonkey])
                    jsonobj[field.jsonkey] = [];
            }
            else {
                jsonobj[field.jsonkey] = element.value;
                if(!jsonobj[field.jsonkey])
                    jsonobj[field.jsonkey] = null;
            }
        }
        else {
            if("jsontype" in field && field.jsontype == "array") {
                jsonobj[field.jsonkey] = [];
            }
            else {
                jsonobj[field.jsonkey] = null;
            }
        }
    }

    if(failed)
        return false;

    // find an object to replace, if it exists
    let sourcePath = sourceTypeToPath[type];
    let sourceJson = gh_source_jsons[sourcePath];
    let index = -1;
    if(index == -1 && jsonobj.title) {
        index = sourceJson.findIndex((e) => jsonobj.title == e.title, jsonobj);
    }

    console.log("Old sources:");
    console.log(JSON.stringify(sourceJson, null, "\t"));

    if(index == -1) {
        sourceJson.push(jsonobj);
        gh_source_modified[sourcePath] = true;
        console.log(`Added new source to ${sourcePath}.`);
    }
    else {
        sourceJson[index] = jsonobj;
        gh_source_modified[sourcePath] = true;
        console.log(`Modfied source ${index} in ${sourcePath}.`);
    }

    ghUploadForm();

    console.log(JSON.stringify(sourceJson, null, "\t"));

}

// create GUI form to upload
function ghUploadForm() {
    // title
    info_container.innerHTML = `<div><strong>Upload changes</strong></div>`;

    if(!username) {
        info_container.innerHTML +=
        `<div>You must be logged in to upload changes.</div>`;
        return false;
    }

    let ulist = "<div>Modified files:</div>";
    ulist += "<div><ul>";

    Object.keys(gh_source_modified).forEach((k) => {
        if(gh_source_modified[k])
            ulist += `<li>${k}</li>`;
    });

    ulist += "</div></ul>";
    info_container.innerHTML += ulist;
    info_container.innerHTML += `<div><button id="uploadButton">Upload changes</button></div>`;
    document.getElementById("uploadButton").addEventListener("click", clickUploadButton);

}

async function clickUploadButton() {
    let failure = await ghUploadModifed();
    if(failure) {
        alert("Upload failed. :(");
    }
    else {
        alert("Upload successful. Please refresh the page to see changes.");
    }
    ghUploadForm();
}

let selectedSource = null;

export function setSelectedSource(source) {
    selectedSource = source;
}

export function getSelectedSource() {
    return selectedSource;
}
