const { dialog } = require('electron').remote;
const { shell } = require('electron');
const path = require('path');
const ffmpeg_static = require('ffmpeg-static');
const fluent_ffmpeg = require('fluent-ffmpeg');
const DEBUG = 1;

fluent_ffmpeg.setFfmpegPath(ffmpeg_static.path);

const pageID = {
    Create_SourceField : 'newInputBox',
    Create_DestinationField : 'newOutputBox',
    Create_OperationField : 'newOperationBox',
    Tasks_CurrentField : 'currentTaskContainer',
    Tasks_CompletedField : 'resultContainer',
}; Object.freeze(pagID);
var TasksMap = undefined;

if(typeof($.fn.popover) != 'undefined') {
    console.log("Bootstrap")
}

function CreateTask_SetInput_Helper(ID, filePath) {
    let e = document.getElementById(elementName);
    if (e == undefined) return;
    element.title = filePath;
    element.value = path.basename(filePath);
}

function GetLocalFile(elementName) {
    // open file chooser
    let filePath = dialog.showOpenDialog({properties: ["openFile"]});
    if (filePath == undefined) return;

    CreateTask_SetInput_Helper(ID, filePath[0]);
}

function SaveLocalFile(ID) {
    let filePath = dialog.showSaveDialog();
    if (filePath == undefined) return;

    CreateTask_SetInput_Helper(ID, filePath[0]);
}

function msToMinSec(time) {
    let result = {Minutes: 0, Seconds: 0};

    time /= 1000;
    result.Minutes = Math.floor(time / 60);
    result.Seconds = Math.floor(time % 60);
    
    return result;
}

function CreateTask()

function ConvertVideo(source, destination, format) {
    let startTime;
    let proc = fluent_ffmpeg(source)
        .toFormat(format)
        .on('start', () => { 
            startTime = new Date(); console.log({startTime: startTime});
        })
        .on('end', (stdout, stderr) => { 
            MoveCurrentTaskToComplete(msToMinSec(new Date() - startTime));
        })
        .on('error', (err) => { 
            console.log('an error happened: ' + err.message);
            MoveCurrentTaskToComplete(msToMinSec(new Date() - startTime)); 
        })
        .save(destination);
    SetCurrentTask(source, destination, format, proc);
}

function ConvertVideoButton() {
    let input = document.getElementById(pageID.Create_SourceField).title;
    let operation = document.getElementById(pageID.Create_OperationField).value;
    let output = document.getElementById(pagID.Create_DestinationField).title;

    output += '.' + operation;

    path.extname(input)
    if (path.extname(input) != operation)
        ConvertVideo(input, output, operation);
}

function AVRE_HeaderHelper(duration) {
    let subElement = document.createElement('div');
    subElement.setAttribute('class', 'card-header');
    subElement.innerText = 'Task - ' + duration.Minutes + ':' + duration.Seconds;
    return subElement;
}

function AVRE_ButtonHelper(pathString) {
    let button = document.createElement('button');
        button.setAttribute('type', 'button');
        button.setAttribute('class', 'btn btn-primary');
        button.setAttribute('onclick', "shell.showItemInFolder(" + JSON.stringify(pathString) + ")");
        button.innerText = 'Open';
    return button;
}

function AVRE_LabelHelper(pathString) {
    let label = document.createElement('label');
    label.innerText = path.basename(pathString);
    return label;
}

function AVRE_CardHelper(pathString) {
    let subElement = document.createElement('div');
    subElement.setAttribute('class', 'card-body');
    { 
        subElement.appendChild(AVRE_ButtonHelper(pathString));
        subElement.appendChild(AVRE_LabelHelper(pathString));
    }
    return subElement;
}

function AppendVideoResultElement(source, destination, duration) {
    // Create Element to Append
    let element = document.createElement('div');
    element.setAttribute('class', 'card border-secondary');

    // Create Task Header
    element.appendChild(AVRE_HeaderHelper(duration));

    // Create Source Section
    element.appendChild(AVRE_CardHelper(source));

    // Create Destination Section
    element.appendChild(AVRE_CardHelper(destination));
    
    // Add Element to Document
    let resultContainer = document.getElementById('resultContainer');
    resultContainer.appendChild(element);
}

function SCT_SectionHeaderHelper(headerString) {
    let element = document.createElement('div');
    element.setAttribute('class', 'card-header');
    element.innerText = headerString;
    return element;
}

function SCT_SourceSmallHelper(filePath) {
    let element = document.createElement('small');
    element.setAttribute('class', 'text-muted');
    element.innerText = JSON.stringify(filePath);
    return element;
}

function SCT_TextAndSmallHelper(text, filePath) {
    let element = document.createElement('div');
    element.setAttribute('class', 'card-body');
    element.innerText = text;
    element.appendChild(SCT_SourceSmallHelper(filePath));
    return element;
}

function SCT_CancelButton() {
    let button = document.createElement('button');
    button.setAttribute('type', 'button');
    button.setAttribute('class', 'btn btn-primary');
    button.setAttribute('onclick', 'SCT_KillFunc()');
    button.innerText = 'Cancel';
    return button;
}

function SCT_KillFunc() {
    if (CurrentTask != null) {
        CurrentTask.Proc.kill();
        MoveCurrentTaskToComplete(0);
    }
}

function SetCurrentTask(source, destination, format, proc) {
    let doc = document.createElement('div');
    CurrentTask = {Source: source, Destination: destination, Format: format, Proc: proc};

    doc.appendChild(SCT_SectionHeaderHelper('CurrentTask'));
    doc.appendChild(SCT_TextAndSmallHelper('Source: ', source));
    doc.appendChild(SCT_TextAndSmallHelper('Destination: ', destination));
    doc.appendChild(SCT_TextAndSmallHelper('Conversion: ', format))
    doc.appendChild(SCT_CancelButton());

    document.getElementById('currentTaskContainer').innerHTML = doc.innerHTML;
}

function MoveCurrentTaskToComplete(duration) {
    AppendVideoResultElement(CurrentTask.Source, CurrentTask.Destination, duration);
    CurrentTask = null;
    let doc = document.getElementById('currentTaskContainer');
    doc.innerHTML = '';
    doc.appendChild(SCT_SectionHeaderHelper('No Current Task'));
}

function createElement(elType, attr) {
    let e = document.createElement(elType);
    setAttributes(e, attr);
}

function setAttributes(el, attr) {
    for (var key in attr) {
        el.setAttribute(key, attr[key]);
    }
}