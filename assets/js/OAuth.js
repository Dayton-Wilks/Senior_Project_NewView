//*****************************************************
// Oauth.js
// Dayton Wilks
// Handles Google authentification
// 
const { BrowserWindow } = require('electron').remote; 
const  app = require('electron').remote.app;
const path = require('path');
const {google} = require('googleapis');
const fs = require('fs');

//var basepath = app.getAppPath();

// let my0authInfo = { 
//     keyFile:"assets/KEY/client_secret.json",
//     scopes: ['https://www.googleapis.com/auth/drive.metadata.readonly'] 
// }

function optTest(val, err = null) {
    if (val == undefined) return err;
    return val;
}

module.exports = class GoogleOauthProvider {
    constructor(opt = {}) {
        this.keyFile = optTest(opt.keyFile);
        this.keyFileData = optTest(opt.keyFileData)
        this.oauth2Client = null;
        this.oauthAqcuired = false;
        this.scopes = optTest(opt.scopes);
        this.authWindow = null;
        this.windowWidth = optTest(opt.windowWidth, 800);
        this.windowHeight = optTest(opt.windowHeight, 600);

        if (this.keyFile && !this.keyFileData) 
            this.LoadKeyFileJson(this.keyFile);
    }

    setKeyFileData(data, token) {
        this.keyFileData = data.keyFileData;
        this.scopes = data.scopes;
        this.oauth2Client = new google.auth.OAuth2(
            this.keyFileData.client_id,
            this.keyFileData.client_secret,
            this.keyFileData.redirect_uris[1]
        );
        this.oauth2Client.setCredentials(token);
    }

    ReloadKeyFile() {
        this.LoadKeyFileJson(this.keyFile);
    }

    LoadKeyFileJson(str) {
        console.log(path.join(app.getAppPath(), str));
        fs.readFile(
            path.join(app.getAppPath(), str), 
            (err, data) => {
            if (err) {
                console.log(err);
                return;
            }
            
            this.keyFileData = JSON.parse(data).installed;
            console.log(this.keyFileData);
            this.keyFile = str;

            this.oauth2Client = new google.auth.OAuth2(
                this.keyFileData.client_id,
                this.keyFileData.client_secret,
                this.keyFileData.redirect_uris[1]
            );
        });
    }

    _DataErrorCheck() {
        let err = null;
        if (this.keyFileData == null) {
            err = 'ERROR: no 0auth key data!';
        }
        else if (this.scopes == null) {
            err = 'No 0auth scopes!';
        }

        if (err != null) {
            console.log(err);
            return true;
        }
        return false;
    }

    _handleCallBack(url) {
        var raw_code = /code=([^&]*)/.exec(url) || null;
        var code = (raw_code && raw_code.length > 1) ? raw_code[1] : null;
        var error = /\?error=(.+)$/.exec(url);
      
        if (code || error) {
          this.authWindow.destroy();
        }
    
        if (code) {
            const request = require('request');
            const token_uri = this.keyFileData.token_uri;
    
            request.post(
                token_uri, 
                { form:
                    {
                        client_id: this.keyFileData.client_id,
                        client_secret: this.keyFileData.client_secret,
                        code: code,
                        grant_type: "authorization_code",
                        redirect_uri: this.keyFileData.redirect_uris[1]
                    }
                },
                (err, httpResponse, body) => {
                    //console.log({err, httpResponse, body});
                    const cred = JSON.parse(body);
                    //console.log(cred);
    
                    this.oauth2Client.setCredentials(cred);
                    this.oauthAqcuired = true;
                }
            );
              
        } else if (error) {
          alert('Oops! Something went wrong and we couldn\'t' +
            'log you in using Google. Please try again.');
        }
    }

    CreateLoginWindow() {
        if (this._DataErrorCheck()) return;

        this.authWindow = new BrowserWindow(
        { 
            width: this.windowWidth, 
            height: this.windowHeight, 
            show: false, 
            'node-integration': true 
        });

        let url = this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: this.scopes
        });
    
        this.authWindow.loadURL(url);
        this.authWindow.show();

        var self = this;
    
        this.authWindow.webContents.on(
            'will-navigate', 
            (event, url) => {
                self._handleCallBack(url);
            },
        );
    
        this.authWindow.webContents.on(
            'did-get-redirect-request', 
            (event, oldUrl, newUrl) => {
                self._handleCallBack(url);
            },
        );
    
        // Reset the authWindow on close
        this.authWindow.on(
            'close', 
            () => {
                self.authWindow = null;
            },
            false
        );
    }
}

// var keyData = {
//     client_id:"925814770662-6vr26bdu52mt4u13t0vmd1et1hvto3bt.apps.googleusercontent.com",
//     client_secret:"H1X8eE-hj4x-vUZCaMiDz5qV",
//     auth_uri:"https://oauth2.googleapis.com/token"
// }

// var oauth2Client = new google.auth.OAuth2(
//     keyData.client_id,
//     keyData.client_secret,
//     "http://localhost"
//   );

// var scopes = [
//     'https://www.googleapis.com/auth/drive.metadata.readonly'
// ];

// var url = oauth2Client.generateAuthUrl({
//     access_type: 'offline',
//     scope: scopes
// });



// var authWindow;
// function CreateLoginWindow() {
//     let url = oauth2Client.generateAuthUrl({
//         access_type: 'offline',
//         scope: scopes
//     });

//     authWindow = new BrowserWindow(
//     { 
//         width: 800, 
//         height: 600, 
//         show: false, 
//         'node-integration': true 
//     });

//     authWindow.loadURL(url);
//     authWindow.show();

//     authWindow.webContents.on('will-navigate', function (event, url) {
//         handleCallback(url);
//     });

//     authWindow.webContents.on(
//         'did-get-redirect-request', 
//         function (event, oldUrl, newUrl) {
//         handleCallback(newUrl);
//     });

//     // Reset the authWindow on close
//     authWindow.on(
//         'close', 
//         () => {authWindow = null;},
//         false
//     );
// }

// function handleCallback (url) {
//     var raw_code = /code=([^&]*)/.exec(url) || null;
//     var code = (raw_code && raw_code.length > 1) ? raw_code[1] : null;
//     var error = /\?error=(.+)$/.exec(url);
  
//     if (code || error) {
//       authWindow.destroy();
//     }

//     if (code) {
//         const request = require('request');
//         const token_uri = keyData.auth_uri;

//         request.post(token_uri, { form:
//             {client_id: keyData.client_id,
//             client_secret: keyData.client_secret,
//             code: code,
//             grant_type: "authorization_code",
//             redirect_uri: 'http://localhost'}
//             },
//             (err, httpResponse, body) => {
//                 console.log({err, httpResponse, body});
//                 const cred = JSON.parse(body);
//                 console.log(cred);

//                 oauth2Client.setCredentials(cred);


//                 const drive = google.drive({version: 'v3', auth: oauth2Client});
//                 drive.files.list({
//                     pageSize: 10,
//                     fields: 'nextPageToken, files(id, name)',
//                     }, 
//                     (err, res) => {
//                         if (err) return console.log('The API returned an error: ' + err);
//                         const files = res.data.files;
//                         if (files.length) {
//                         console.log('Files:');
//                         files.map((file) => {
//                             console.log(`${file.name} (${file.id})`);
//                         });
//                         } else {
//                         console.log('No files found.');
//                     }
//                 });
//             }
//         );
          
//     } else if (error) {
//       alert('Oops! Something went wrong and we couldn\'t' +
//         'log you in using Github. Please try again.');
//     }
// }