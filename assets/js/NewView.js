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
const fs = require('fs');

const GoogleOauthProvider = require(path.join(app.getAppPath(), 'assets/js/OAuth.js'));
const DriveFileSelectFunction = require(path.join(app.getAppPath(), 'assets/js/DriveFileSelectFunction.js'));
const elementHelpers = require(path.join(app.getAppPath(), 'assets/js/ElementHelpers.js'));
// const setAttributes = elementHelpers.setAttributes;
const createElement = elementHelpers.createElement;

const pageID = {
    Create_SourceField : 'newInputBox',
    Create_DestinationField : 'newOutputBox',
    Create_OperationField : 'newOperationBox',
    Tasks_CurrentField : 'currentTaskContainer',
    Tasks_CompletedField : 'resultContainer',
    GoogleIDContainer : 'GoogleID',
    GoogleUploadCheck : 'uploadCheck'
}; Object.freeze(pageID);

const OAuth = new GoogleOauthProvider({ 
    keyFile:"assets\\KEY\\client_secret.json",
    scopes: ['https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/drive.metadata'] 
});

ipcRenderer.on('drive-file-key', (event, message) => {
    // let GoogleElement = document.getElementById(pageID.GoogleID);

    // GoogleElement.innerText = message;
    console.log(message);
    SetFileDriveData(message.id, message.name);
})

//********************************************************
// Initilization
fluent_ffmpeg.setFfmpegPath(ffmpeg_static.path);


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
        this.GoogleID = null; 
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
        let element = document.createElement('div', {'class':'card border-secondary'});
        //console.log(element.tagName);

        // Create Header
        let t = createElement('div', {'class':'card-header'}, 'Task ' + this.ID);
        element.appendChild(t);
        element.appendChild(
            createElement(
                'button',
                {
                    'type' : 'button',
                    'class' : 'btn btn-info',
                    'data-toggle' : 'collapse',
                    'data-target' : '#body' + this.ID
                },
                'Collapse'
            )
        );

        // Source Section
        t = createElement(
            'div',
            {
                'id' : 'body' + this.ID,
                'class' : 'collapse'
            }
        );

        t.appendChild(this._CreateSmallElement_Helper('Source: ', this.Source));

        // Destination Section
        t.appendChild(this._CreateSmallElement_Helper('Destination: ', this.Destination));

        // Operation Type Section
        t.appendChild(this._CreateSmallElement_Helper('Operation: ', this.Operation));

        element.appendChild(t);

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
        console.log(this);
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
    let index = CurrentTaskArray.find((aTask) => { return aTask.ID == ID; });
    console.log({ID, index});
    if (index != null && index != undefined) {
        if (index._Cancel()) console.log('Cancelled Task ' + index.ID);
        else console.log('Unable To Cancel Task ' + ID);
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

    document.getElementById(pageID.GoogleIDContainer).innerText = "";

    CreateTask_SetInput_Helper(elementName, filePath[0]);
}

function SaveLocalFile(ID) {
    let filePath = dialog.showSaveDialog({ properties: ['openFile'] });
    if (filePath == undefined) return;

    CreateTask_SetInput_Helper(ID, filePath);
}

function GetDriveFileID() {
    //console.log(OAuth.oauth2Client);
    if (OAuth.oauthAqcuired == false) return OAuth.CreateLoginWindow();
    DriveFileSelectFunction(OAuth.oauth2Client);
}

function SetFileDriveData(id, name) {
    let filepath = dialog.showSaveDialog({ properties: ['openFile'] })
    let GoogleElement = document.getElementById(pageID.GoogleIDContainer);

    filepath += path.extname(name);

    GoogleElement.innerText = id;
    CreateTask_SetInput_Helper(pageID.Create_SourceField, filepath);
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

var testTask = null;
//********************************************************
// Button Functions
function ConvertVideo(source, destination, format, googleID, upload) {
    let aTask = new Task();
    aTask.Source = source;
    aTask.Destination = destination;
    aTask.Operation = format;
    aTask.GoogleID = googleID;
    aTask.DriveUpload = upload;

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
        if (upload == true) {
            DriveFileUpload(aTask);
        }
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

    if (googleID == '') aTask.FFmpeg_Instance.save(destination);
    else {
        DownloadDriveFile(aTask, (task) => {
            task.FFmpeg_Instance.save(aTask.Destination);
        } );
    }

    // aTask.FFmpeg_Instance
    //     .input(source)
    //     .toFormat(format)
    //     .on('start', () => {
    //         console.log('Starting Task ' + aTask.ID);
    //         aTask.State = StateType.Working;
    //         aTask.StartTime = new Date();
    //         CurrentTaskArray.push(aTask);
    //     })
    //     .on('end', (stdout, stderr) => {
    //         console.log('Ending Task ' + aTask.ID);
    //         aTask.State = StateType.Complete;
    //         aTask.EndTime = new Date();
    //         const index = CurrentTaskArray.lastIndexOf(aTask);
    //         CurrentTaskArray.splice(index, 1);
    //         CompleteTaskArray.unshift(aTask);
    //     })
    //     .on('error', (err) => {
    //         console.log('ffmpeg encountered an error:');
    //         console.log(err);
    //         aTask.State = StateType.Error;
    //         aTask.EndTime = new Date();
    //         const index = CurrentTaskArray.lastIndexOf(aTask);
    //         CurrentTaskArray.splice(index, 1);
    //         CompleteTaskArray.unshift(aTask);
    //     })
    //     .save(destination);
}

function DownloadDriveFile(taskInstance, callback) {
    let dest = fs.createWriteStream(taskInstance.Source);
    let drive = google.drive({version:'v3', auth:OAuth.oauth2Client});

    console.log(taskInstance);

    drive.files.get(
        {
            fileId: taskInstance.GoogleID,
            alt: 'media'
        },
        {
            responseType:"stream"
        },
        (err, res) => {
            console.log('Download Start');
            res.data
                .on('end', () => {
                    console.log('Download Done');
                    callback(taskInstance);
                })
                .on('error', err => {
                    console.log('Error Downloading - ' + err);
                })
                .pipe(dest);
        }
    );
    // .on('end', () => {
    //     callback(taskInstance);
    // })
    // .on('error', (err) => {
    //     console.log('Error during download - ' + err);
    // })
    // .pipe(dest);
}

function ConvertVideoButton() {
    let input = document.getElementById(pageID.Create_SourceField).title;
    let operation = document.getElementById(pageID.Create_OperationField).value;
    let output = document.getElementById(pageID.Create_DestinationField).title;
    
    let GoogleElement = document.getElementById(pageID.GoogleIDContainer);
    let uploadCheck = document.getElementById(pageID.GoogleUploadCheck).checked;
    let googleID = GoogleElement.innerText;
    GoogleElement.innerText = "";

    output += '.' + operation;

    path.extname(input)
    if (path.extname(input) != operation)
        ConvertVideo(input, output, operation, googleID, uploadCheck);
}

async function DriveFileUpload(aTask) {
    const drive = google.drive({
        version: 'v3',
        auth: OAuth.oauth2Client
    });
    try {
    const res = await drive.files.create({
        requestBody: {
          name: path.basename(aTask.Destination),
          //mimeType: 'image/png'
        },
        media: {
          //mimeType: 'image/png',
          body: fs.createReadStream(aTask.Destination)
        }
      });
      console.log("File uploaded!");
      console.log(res.data);
    } catch (err) {
        console.log("Not Logged In!");
    }
}

