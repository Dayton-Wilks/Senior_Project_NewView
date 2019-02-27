const { BrowserWindow } = require('electron').remote; 
const  app = require('electron').remote.app;
const path = require('path');
const {google} = require('googleapis');

function DisplayDriveFileSelect(OAuthClient, callback) {
    let htmlPath = path.join(app.getAppPath(), '\\assets\\HTML\\DriveFileSelect.html');

    let driveWindow = new BrowserWindow({
        width: 800, 
        height: 600, 
        show: false, 
        'node-integration': true
    });

    driveWindow.on(
        'ready-to-show',
        () => {
            driveWindow.show();
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