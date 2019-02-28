const { BrowserWindow } = require('electron').remote; 
const remote = require ("electron").remote;
const ipc = require('electron').ipcRenderer;
const  app = require('electron').remote.app;
const path = require('path');

function DisplayDriveFileSelect(OAuthClient, callback) {
    let htmlPath = path.join(app.getAppPath(), '\\assets\\HTML\\DriveFileSelect.html');
    let mainWindow = remote.getCurrentWindow();

    let driveWindow = new BrowserWindow({
        width: 800, 
        height: 600, 
        show: false,
        parent: mainWindow,
        modal: true, 
        'node-integration': true
    });

    driveWindow.on(
        'ready-to-show',
        () => {
            driveWindow.show();
            driveWindow.webContents.send('message', 'Hello second window!');
        }
    );

    driveWindow.on(
        'close',
        () => {
            driveWindow = null;
        }
    );

    driveWindow.loadFile(htmlPath);

}

module.exports = DisplayDriveFileSelect;