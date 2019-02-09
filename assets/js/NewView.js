const { dialog } = require('electron').remote;
const { shell } = require('electron');
const array = require('array');
const path = require('path');
const ffmpeg_static = require('ffmpeg-static');
const fluent_ffmpeg = require('fluent-ffmpeg');
const DEBUG = 1;

fluent_ffmpeg.setFfmpegPath(ffmpeg_static.path);

if(typeof($.fn.popover) != 'undefined') {
    console.log("Bootstrap")
}

const pageID = {
    Create_SourceField : 'newInputBox',
    Create_DestinationField : 'newOutputBox',
    Create_OperationField : 'newOperationBox',
    Tasks_CurrentField : 'currentTaskContainer',
    Tasks_CompletedField : 'resultContainer',
}; Object.freeze(pageID);

var taskCounter = 0;
var StateType = { 
    Working:1,
    Pending:2,
    Complete:3,
    Error:4
};

class Task {
    constructor() {
        this.Source = null;
        this.Destination = null;
        this.Operation = null;
        this.StartTime = null;
        this.EndTime = null;
        this.FFmpeg_Instance = fluent_ffmpeg();
        this.Thread_Instance = null;
        this.ID = taskCounter++; 
        this.State = StateType.Pending; 
        // x instanceof Task
    }
    
    CreateTaskElement() {
        if (this.State == StateType.Pending || this.State == StateType.Working)
            return this._CreateCurrentElement();
        else if (this.State == StateType.Complete)
            return this._CreateCompleteElement();
        else if (this.State == StateType.Error)
            return this._CreateErrorElement();
        console.log('ERROR: Creating Task Element'); 
        return null;
    }

    static CancelTask(ID) { // Task.CancelTask(ID)
        if (this._Cancel()) console.log('Cancelled Task ' + this.ID);
        else console.log('Unable To Cancel Task ' + this.ID);
    }
   
    _CreateCurrentElement() {
        let element = createElement('div');
        let headerString = 'Current Task'

        // Create Header
        let t = createElement('div', {'class':'card-header'}, headerString);
        console.log(element);
        console.log(t);
        element.appendChild(t);

        // Source Section
        element.appendChild(_CreateSmallElement_Helper('Source: ', this.Source));

        // Destination Section
        element.appendChild(_CreateSmallElement_Helper('Destination: ', this.Destination));

        // Operation Type Section
        element.appendChild(_CreateSmallElement_Helper('Operation: ', this.Operation));

        // Cancel Button
        element.appendChild(_CreateCancelButton_Helper());

        return element;
    }

    _CreateCompleteElement() {
        let element = createElement('div', {'class':'card border-secondary'});
        let duration = msToMinSec(this.EndTime - this.StartTime);
        let headerString = 'Task ' + this.ID + ' - '; 

        if (this.EndTime != null && this.StartTime != null) 
            headerString += duration.Minutes + ':' + duration.Seconds;

        // Task Header
        console.log(element);
        element.appendChild(createElement('div', {'class':'card-header'}, headerString));

        // Create Source Section
        element.appendChild(this.Source);

        // Create Destination Section
        element.appendChild(this.Destination);

        return element;
    }

    _Cancel() {
        if (this.State == StateType.Working && this.FFmpeg_Instance != null) {
            this.FFmpeg_Instance.kill();
            return true;
        }
        return false;
    }

    _CreateCancelButton_Helper() {
        return createElement(
            'button',
            {
                'type' : 'button',
                'class' : 'btn btn-primary',
                'onclick' : 'Task.CancelTask(' + this.ID + ')'
            },
            'Cancel'
        );
    }

    _CreateSmallElement_Helper(text, filePath) {
            let element = createElement('div', {'class':'card-body'}, text);
            element.appendChild(
                createElement('small', {'class':'text-muted'}, JSON.stringify(filePath))
                );
            return element;
    }

    _FileResultElement(pathString) {
        let element = createElement('div', {'class':'card-body'});

        // Create Button
        element.appendChild(
            createElement(
                'div',
                {
                    'type':'button',
                    'class':'btn btn-primary',
                    'onclick': "shell.showItemInFolder(" + JSON.stringify(pathString) + ")"
                },
                'Open'
        ));

        // Create Label
        element.appendChild(
            createElement(
                'label', 
                {},
                path.basename(pathString)
            )
        );
        
        return element;
    }

    _CreateErrorElement() { // Expand Later
        return createElement('div', {'TaskID':this.ID}, 'Error');
    }
} 

function setAttributes(el, attr) {
    for (var key in attr) {
        el.setAttribute(key, attr[key]);
    }
}

function createElement(elType, attr, innerText) {
    let e = document.createElement(elType);
    setAttributes(e, attr);
    if (innerText != undefined) e.innerText = innerText;
}

var CurrentTaskArray = array();
CurrentTaskArray.on('change', Update_CurrentTasks);

function Update_CurrentTasks() {
    console.log("Current Updating");
    let container = document.createElement('div');
    container.append(createElement('div', {'class':'card-header'}, 'Current Task'));
    CurrentTaskArray.each((val, i) => {
        container.appendChild(val.CreateTaskElement());
    });
    document.getElementById(pageID.Tasks_CurrentField).innerHTML = container.innerHTML;
    console.log('Finish Current Update');
}

var CompleteTaskArray = array();
CompleteTaskArray.on('change', Update_CompleteTasks);

function Update_CompleteTasks() {
    console.log("Complete Updating");
    let container = document.createElement('div');
    container.append(createElement('div', {'class':'card-header'}, 'Complete Tasks'));
    CompleteTaskArray.each((val, i) => {
        let t = val.CreateTaskElement()
        console.log({val, t,innerHTML});
        container.appendChild(val.CreateTaskElement());
    });
    document.getElementById(pageID.Tasks_CompletedField).innerHTML = container.innerHTML;
    console.log('Finish Complete Update');
}

function CreateTask_SetInput_Helper(ID, filePath) {
    let e = document.getElementById(ID);
    if (e == undefined) return;
    e.title = filePath;
    e.value = path.basename(filePath);
}

function GetLocalFile(elementName) {
    // open file chooser
    let filePath = dialog.showOpenDialog({properties: ["openFile"]});
    if (filePath == undefined) return;

    CreateTask_SetInput_Helper(elementName, filePath[0]);
}

function SaveLocalFile(ID) {
    let filePath = dialog.showSaveDialog();
    if (filePath == undefined) return;

    CreateTask_SetInput_Helper(ID, filePath);
}

function msToMinSec(time) {
    let result = {Minutes: 0, Seconds: 0};

    time /= 1000;
    result.Minutes = Math.floor(time / 60);
    result.Seconds = Math.floor(time % 60);
    
    return result;
}

// function CreateTask()

function ConvertVideo(source, destination, format) {
    let aTask = new Task();
    aTask.Source = source;
    aTask.Destination = destination;
    aTask.Operation = format;
    aTask.FFmpeg_Instance
        .input(source)
        .toFormat(format)
        .on('start', () => {
            console.log('Starting Task ' + aTask.ID);
            aTask.State = StateType.Working;
            aTask.StartTime = new Date();
            CurrentTaskArray.push(aTask);
        })
        .on('end', (stdout, stderr) => {
            console.log('Ending Task ' + aTask.ID);
            aTask.State = StateType.Complete;
            aTask.EndTime = new Date();
            CurrentTaskArray = CurrentTaskArray.select((item) => {
                return item.ID != aTask.ID;
            })
            CompleteTaskArray.unshift(aTask);
        })
        .on('error', (err) => {
            console.log('ffmpeg encountered an error:');
            console.log(err);
            aTask.State = StateType.Error;
            aTask.EndTime = new Date();
            CurrentTaskArray = CurrentTaskArray.select((item) => {
                return item.ID != aTask.ID;
            })
            CompleteTaskArray.unshift(aTask);
        })
        .save(destination);

    // let startTime;
    // let proc = fluent_ffmpeg(source)
    //     .toFormat(format)
    //     .on('start', () => { 
    //         startTime = new Date(); console.log({startTime: startTime});
    //     })
    //     .on('end', (stdout, stderr) => { 
    //         MoveCurrentTaskToComplete(msToMinSec(new Date() - startTime));
    //     })
    //     .on('error', (err) => { 
    //         console.log('an error happened: ' + err.message);
    //         MoveCurrentTaskToComplete(msToMinSec(new Date() - startTime)); 
    //     })
    //     .save(destination);
    // SetCurrentTask(source, destination, format, proc);
}

function ConvertVideoButton() {
    let input = document.getElementById(pageID.Create_SourceField).title;
    let operation = document.getElementById(pageID.Create_OperationField).value;
    let output = document.getElementById(pageID.Create_DestinationField).title;

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
