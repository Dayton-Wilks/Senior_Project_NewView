const { BrowserWindow } = require('electron').remote; 
const remote = require ("electron").remote;
const ipc = require('electron').ipcRenderer;
const  app = require('electron').remote.app;
const path = require('path');

function DisplayDriveFileSelect(oauth2Client, callback) {
    let htmlPath = path.join(app.getAppPath(), '\\assets\\HTML\\DriveFileSelect.html');
    let mainWindow = remote.getCurrentWindow();

    const drive = google.drive({version:'v3', auth: oauth2Client});
    drive.files.list(
        {
            pageSize: 150,
            q: "fileExtension = 'mp4' or fileExtension = 'avi' and trashed = false",
            fields: 'files(name, fileExtension, id, modifiedTime, trashed, thumbnailLink)',
            spaces: 'drive'
        },
        (err, res) => {
            if (err) {
                console.log('The API returned error: ' + err);
                return;
            }   
            
            let driveWindow = new BrowserWindow({
                width: 1000, 
                height: 600, 
                show: false,
                parent: mainWindow,
                modal: true, 
                'node-integration': true
            });

            driveWindow.on(
                'ready-to-show',
                () => {
                    driveWindow.webContents.openDevTools()
                    
                    driveWindow.webContents.send('auth-data', res);
                    
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
    )
}


module.exports = DisplayDriveFileSelect;