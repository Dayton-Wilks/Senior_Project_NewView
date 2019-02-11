//********************************************************
// Includes
const { dialog } = require('electron').remote;
const { shell } = require('electron');
const array = require('array');
const path = require('path');
const ffmpeg_static = require('ffmpeg-static');
const fluent_ffmpeg = require('fluent-ffmpeg');

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
// Element Helpers
function setAttributes(el, attr) {
    for (var key in attr) {
        el.setAttribute(key, attr[key]);
    }
}

function createElement(elType, attr, innerText) {
    let e = document.createElement(elType);
    if (attr != undefined) setAttributes(e, attr);
    if (innerText != undefined) e.innerText = innerText;
    return e;
}

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

    static CancelTask(ID) { // Task.CancelTask(ID)
        if (this._Cancel()) console.log('Cancelled Task ' + this.ID);
        else console.log('Unable To Cancel Task ' + this.ID);
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

//********************************************************
//********************************************************
// Drive API Stuff
// const {OAuth2Client} = require('google-auth-library');
// const http = require('http');
// const url = require('url');
// const opn = require('opn');
// const destroyer = require('server-destroy');

// // Download your OAuth2 configuration from the Google
// //const keys = require('./oauth2.keys.json');

// /**
//  * Start by acquiring a pre-authenticated oAuth2 client.
//  */
// async function main() {
//   const oAuth2Client = await getAuthenticatedClient();
//   // Make a simple request to the People API using our pre-authenticated client. The `request()` method
//   // takes an GaxiosOptions object.  Visit https://github.com/JustinBeckwith/gaxios.
// //   const url = 'https://people.googleapis.com/v1/people/me?personFields=names';
// //   const res = await oAuth2Client.request({url});
// const drive = google.drive({version: 'v3', oauth2Client});
//     drive.files.list({
//         pageSize: 10,
//         fields: 'nextPageToken, files(id, name)',
//         }, 
//         (err, res) => {
//             if (err) return console.log('The API returned an error: ' + err);
//             const files = res.data.files;
//             if (files.length) {
//             console.log('Files:');
//             files.map((file) => {
//                 console.log(`${file.name} (${file.id})`);
//             });
//             } else {
//             console.log('No files found.');
//         }
//     });
//   //console.log(res.data);

//   // After acquiring an access_token, you may want to check on the audience, expiration,
//   // or original scopes requested.  You can do that with the `getTokenInfo` method.
//   const tokenInfo = await oAuth2Client.getTokenInfo(
//     oAuth2Client.credentials.access_token
//   );
//   console.log(tokenInfo);
// }

// /**
//  * Create a new OAuth2Client, and go through the OAuth2 content
//  * workflow.  Return the full client to the callback.
//  */
// function getAuthenticatedClient() {
//   return new Promise((resolve, reject) => {
//     // create an oAuth client to authorize the API call.  Secrets are kept in a `keys.json` file,
//     // which should be downloaded from the Google Developers Console.
//     const oAuth2Client = new OAuth2Client(

//         "http://localhost:3000"
//     );

//     // Generate the url that will be used for the consent dialog.
//     const authorizeUrl = oAuth2Client.generateAuthUrl({
//       access_type: 'offline',
//       scope: 'https://www.googleapis.com/auth/drive.metadata.readonly',
//     });

//     // Open an http server to accept the oauth callback. In this simple example, the
//     // only request to our webserver is to /oauth2callback?code=<code>
//     const server = http
//       .createServer(async (req, res) => {
//           console.log('Creating server')
//         try {
//           if (req.url.indexOf('/oauth2callback') > -1) {
//             // acquire the code from the querystring, and close the web server.
//             const qs = new url.URL(req.url, 'http://localhost:3000')
//               .searchParams;
//             const code = qs.get('code');
//             console.log(`Code is ${code}`);
//             res.end('Authentication successful! Please return to the console.');
//             server.destroy();

//             // Now that we have the code, use that to acquire tokens.
//             const r = await oAuth2Client.getToken(code);
//             // Make sure to set the credentials on the OAuth2 client.
//             oAuth2Client.setCredentials(r.tokens);
//             console.info('Tokens acquired.');
//             resolve(oAuth2Client);
//           }
//         } catch (e) {
//           reject(e);
//         }
//       })
//       .listen(3000, () => {
//         console.log('Listening to server')
//         // open the browser to the authorize url to start the workflow
//         opn(authorizeUrl, {wait: false}).then(cp => cp.unref());
//       });
//       console.log('Destroying server')
//     destroyer(server);
//   });
// }

// main().catch(console.error);


const {google} = require('googleapis');
const { BrowserWindow } = require('electron').remote; 
const  app = require('electron').remote.app;

var basepath = app.getAppPath();

const oauth2Client = new google.auth.OAuth2(
    "clientid",
    "secret?",
    "http://localhost"
  );

const scopes = [
    'https://www.googleapis.com/auth/drive.metadata.readonly'
];

const url = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: 'offline',
    approval_prompt : 'force',
    // If you only need one scope you can pass it as a string
    scope: scopes
});
 
var authWindow = new BrowserWindow(
{ 
    width: 800, 
    height: 600, 
    show: false, 
    'node-integration': true 
});
console.log(url);
authWindow.loadURL(url);
authWindow.show();

function handleCallback (url) {
    var raw_code = /code=([^&]*)/.exec(url) || null;
    var code = (raw_code && raw_code.length > 1) ? raw_code[1] : null;
    var error = /\?error=(.+)$/.exec(url);
  
    if (code || error) {
      // Close the browser if code found or error
      authWindow.destroy();
    }
  
    // If there is a code, proceed to get token from github
    if (code) {
        console.log('good');
        // let tokens = oauth2Client.getToken(code, (err, t) => {if (err) console.log('Error getting tokens')});
        // console.log({url, code});
        // oauth2Client.setCredentials(tokens);



        const request = require('request');

        request.get(url, { json: true }, (err, res, body) => {
        if (err) { console.log(err); }
        console.log(url);
        console.log(res);
        console.log(body);
        });
          

        const drive = google.drive({version: 'v3', oauth2Client});
        drive.files.list({
            pageSize: 10,
            fields: 'nextPageToken, files(id, name)',
            }, 
            (err, res) => {
                if (err) return console.log('The API returned an error: ' + err);
                const files = res.data.files;
                if (files.length) {
                console.log('Files:');
                files.map((file) => {
                    console.log(`${file.name} (${file.id})`);
                });
                } else {
                console.log('No files found.');
            }
        });
    } else if (error) {
      alert('Oops! Something went wrong and we couldn\'t' +
        'log you in using Github. Please try again.');
    }
}

authWindow.webContents.on('will-navigate', function (event, url) {
    handleCallback(url);
});
  
authWindow.webContents.on(
    'did-get-redirect-request', 
    function (event, oldUrl, newUrl) {
    handleCallback(newUrl);
});

// Reset the authWindow on close
authWindow.on(
    'close', 
    () => {authWindow = null;},
    false
);

// Each API may support multiple version. With this sample, we're getting
// v3 of the blogger API, and using an API key to authenticate.
// const GD = google.drive({
//   version: 'v3',
//   auth: oauth2Client
// });


 
// const params = {
//   blogId: 3213900
// };
 
// // get the blog details
// blogger.blogs.get(params, (err, res) => {
//   if (err) {
//     console.error(err);
//     throw err;
//   }
//   console.log(`The blog url is ${res.data.url}`);
// });