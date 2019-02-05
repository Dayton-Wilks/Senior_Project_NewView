const { dialog } = require('electron').remote;
const { shell } = require('electron');
const path = require('path');
var ffmpeg_static = require('ffmpeg-static');
var fluent_ffmpeg = require('fluent-ffmpeg');
fluent_ffmpeg.setFfmpegPath(ffmpeg_static.path);

const supportedImageFormats = ["jpeg", "png", "bmp", "tiff", "gif"];
const supportedVideoFormats = ["avi", "mp4"];
const supportedAudioFormats = [];
const DEBUG = 1;

class Chain

if(typeof($.fn.popover) != 'undefined') {
    console.log("Bootstrap")
}

function GetLocalFile(elementName) {
    let filePath = dialog.showOpenDialog({properties: ["openFile"]});
    let element = document.getElementById(elementName);

    element.title = filePath[0];
    element.value = filePath[0].slice(filePath[0].lastIndexOf("\\") + 1);
}

function SaveLocalFile(elementName) {
    let filePath = dialog.showSaveDialog();
    //filePath = new String(filePath);
    let element = document.getElementById(elementName);

    element.title = filePath;
    element.value = filePath.slice(filePath.lastIndexOf("\\") + 1);
    //element.value = path.basename(filePath);
}

function msToMinSec(time) {
    let result = {Minutes: 0, Seconds: 0};

    time /= 1000;
    result.Minutes = Math.floor(time / 60);
    result.Seconds = Math.floor(time % 60);
    
    return result;
}

function ConvertVideo(source, destination, format) {
    let startTime;
    let proc = fluent_ffmpeg(source)
        .toFormat(format)
        .on('start', () => { 
            startTime = new Date(); console.log({startTime: startTime});
        })
        .on('end', (stdout, stderr) => { 
            AppendVideoResultElement(source, destination, msToMinSec(new Date() - startTime));
        })
        .on('error', (err) => { console.log('an error happened: ' + err.message); })
        .save(destination);
}

function ConvertVideoButton() {
    let input = document.getElementById('newInputBox').title;
    let operation = document.getElementById('newOperationBox').value;
    let output = document.getElementById('newOutputBox').title;

    output += '.' + operation;

    console.log({input, operation, output});

    if (input.slice(input.lastIndexOf('.')) != operation)
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

function SetCurrentTask(source, destination, format) {
    let doc = document.getElementById('currentTaskContainer');

    let taskElement = document.createElement('div');
    taskElement.setAttribute('class', 'card-header');
    taskElement.innerText = 'Current Task';

    doc.innerHTML = '';
    doc.appendChild(taskElement);

    taskElement = document.createElement('div');
    taskElement.setAttribute('class', 'card-body');
    taskElement.innerText = 'Source: ';

    let subElement = document.createElement('small');
    subElement.setAttribute('class', 'text-muted');
    subElement.innerText = JSON.stringify(source);
    
    taskElement.appendChild(subElement);

    doc.appendChild(taskElement);

    taskElement = document.createElement('div');
    let test = taskElement.setAttribute('class', 'card-body');
    taskElement.innerText = 'Source: ';

    subElement = document.createElement('small');
    subElement.setAttribute('class', 'text-muted');
    subElement.innerText = JSON.stringify(destination);
    
    taskElement.appendChild(subElement);
    
    taskElement = document.createElement('div');
    taskElement.setAttribute('class', 'card-body');
    taskElement.innerText = 'Conversion: ';

    subElement = document.createElement('small');
    subElement.setAttribute('class', 'text-muted');
    subElement.innerText = JSON.stringify(format);
    
    taskElement.appendChild(subElement);
}