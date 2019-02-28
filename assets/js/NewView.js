//********************************************************
// Includes
const { dialog } = require('electron').remote;
const { ipcRenderer } = require('electron');
const { shell } = require('electron');
const array = require('array');
const path = require('path');
const ffmpeg_static = require('ffmpeg-static');
const fluent_ffmpeg = require('fluent-ffmpeg');
const { google } = require('googleapis');
const app = require('electron').remote.app;

const GoogleOauthProvider = require(path.join(app.getAppPath(), 'assets/js/OAuth.js'));
const DriveFileSelectFunction = require(path.join(app.getAppPath(), 'assets/js/DriveFileSelectFunction.js'));
const elementHelpers = require(path.join(app.getAppPath(), 'assets/js/ElementHelpers.js'));
// const setAttributes = elementHelpers.setAttributes;
const createElement = elementHelpers.createElement;

const OAuth = new GoogleOauthProvider({ 
    keyFile:"assets\\KEY\\client_secret.json",
    scopes: ['https://www.googleapis.com/auth/drive.metadata.readonly'] 
});

ipcRenderer.on('reply', (event, message) => {
    console.log(message);
})

//********************************************************
// Initilization
fluent_ffmpeg.setFfmpegPath(ffmpeg_static.path);

const pageID = {
    Create_SourceField : 'newInputBox',
    Create_DestinationField : 'newOutputBox',
    Create_OperationField : 'newOperationBox',
    Tasks_CurrentField : 'currentTaskContainer',
    Tasks_CompletedField : 'resultContainer',
}; Object.freeze(pageID);

//********************************************************
// Globals
var taskCounter = 0; // Task ID gen
const StateType = { // State of a task
    Working:1,
    Pending:2,
    Complete:3,
    Error:4
}; Object.freeze(StateType);

//********************************************************
// Task Class
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
    
    //********************************************************
    // public methods
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
   
    //********************************************************
    // Create Element Methods
    _CreateCurrentElement() {
        let element = document.createElement('div');
        console.log(element.tagName);

        // Create Header
        let t = createElement('div', {'class':'card-header'}, 'Task ' + this.ID);
        element.appendChild(t);

        // Source Section
        element.appendChild(this._CreateSmallElement_Helper('Source: ', this.Source));

        // Destination Section
        element.appendChild(this._CreateSmallElement_Helper('Destination: ', this.Destination));

        // Operation Type Section
        element.appendChild(this._CreateSmallElement_Helper('Operation: ', this.Operation));

        // Cancel Button
        element.appendChild(this._CreateCancelButton_Helper());

        return element;
    }

    _CreateCompleteElement() {
        let element = createElement('div', {'class':'card border-secondary'});
        let duration = msToMinSec(this.EndTime - this.StartTime);
        let headerString = 'Task ' + this.ID + ' - '; 

        if (this.EndTime != null && this.StartTime != null) 
            headerString += duration.Minutes + ':' + duration.Seconds;

        // Task Header
        //console.log(element);
        element.appendChild(createElement('div', {'class':'card-header'}, headerString));

        // Create Source Section
        element.appendChild(this._FileResultElement(this.Source));

        // Create Destination Section
        element.appendChild(this._FileResultElement(this.Destination));

        return element;
    }
    
    _CreateErrorElement() { // Expand Later
        return createElement('div', {'TaskID':this.ID}, 'Error');
    }

    //********************************************************
    // Cancel ffmpeg Proc Method
    _Cancel() {
        if (this.State == StateType.Working && this.FFmpeg_Instance != null) {
            this.FFmpeg_Instance.kill();
            return true;
        }
        return false;
    }

    //********************************************************
    // Element Creation Helpers
    _CreateCancelButton_Helper() {
        return createElement(
            'button',
            {
                'type' : 'button',
                'class' : 'btn btn-primary',
                'onclick' : 'CancelTask(' + this.ID + ')'
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
} 

function CancelTask(ID) { // Task.CancelTask(ID)
    let index = CurrentTaskArray.find(aTask);
    if (index >= 0) {
        if (CurrentTaskArray[index]._Cancel()) console.log('Cancelled Task ' + this.ID);
        else console.log('Unable To Cancel Task ' + this.ID);
    }
}

//********************************************************
// Task Array Functions
var CurrentTaskArray = array();
CurrentTaskArray.on('change', Update_CurrentTasks);

function Update_CurrentTasks() {
    console.log("Current Updating");

    let container = document.createElement('div');

    container.append(createElement('div', {'class':'card-header'}, 'Current Task'));
    CurrentTaskArray.each((val, i) => {
        container.appendChild(val.CreateTaskElement());
    });

    let doc = document.getElementById(pageID.Tasks_CurrentField);
    doc.innerHTML = container.innerHTML;
    console.log('Finish Current Update');
}

var CompleteTaskArray = array();
CompleteTaskArray.on('change', Update_CompleteTasks);

//********************************************************
// Task Creation Functions
function Update_CompleteTasks() {
    console.log("Complete Updating");
    let container = document.createElement('div');
    container.append(createElement('div', {'class':'card-header'}, 'Complete Tasks'));
    CompleteTaskArray.each((val, i) => {
        let t = val.CreateTaskElement()
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

//********************************************************
// File Access Functions
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

//********************************************************
// Time Helper Functions
function msToMinSec(time) {
    let result = {Minutes: 0, Seconds: 0};

    time /= 1000;
    result.Minutes = Math.floor(time / 60);
    result.Seconds = Math.floor(time % 60);
    
    return result;
}

//********************************************************
// Button Functions
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
            const index = CurrentTaskArray.lastIndexOf(aTask);
            CurrentTaskArray.splice(index, 1);
            CompleteTaskArray.unshift(aTask);
        })
        .on('error', (err) => {
            console.log('ffmpeg encountered an error:');
            console.log(err);
            aTask.State = StateType.Error;
            aTask.EndTime = new Date();
            const index = CurrentTaskArray.lastIndexOf(aTask);
            CurrentTaskArray.splice(index, 1);
            CompleteTaskArray.unshift(aTask);
        })
        .save(destination);
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

