const ipc = require('electron').ipcRenderer;
const  app = require('electron').remote.app;
const path = require('path');
const {google} = require('googleapis');

const elementHelpers = require(path.join(app.getAppPath(), 'assets/js/ElementHelpers.js'));
const createElement = elementHelpers.createElement;

const FileListElementID = 'FileListElement';

ipc.on('message', (event, message) => {
    console.log(message);
    ipc.send('reply', 'Message recieved Main Window!');
});

function AddFiles() {
    let list = document.getElementById(FileListElementID);

}

function GenerateFileElement() {
    let element = document.createElement(
        'button', 
        { 
            'type': 'button',
            'class': 'btn btn-primary',
            'onclick': 'SendKey(' + 'val' + ')'
        }
    );
}

function SendKey() {
   // ((mimeType = 'video/mp4') or (mimeType = 'video/mpeg')) and trashed = false
}