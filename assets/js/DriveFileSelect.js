const ipc = require('electron').ipcRenderer;
const app = require('electron').remote.app;
const remote = require('electron').remote;
const request = require('request');
const path = require('path');
const {google} = require('googleapis');

const GoogleOauthProvider = require(path.join(app.getAppPath(), 'assets/js/OAuth.js'));

const elementHelpers = require(path.join(app.getAppPath(), 'assets/js/ElementHelpers.js'));
const createElement = elementHelpers.createElement;

const FileListElementID = 'FileListElement';

ipc.on('auth-data', (event, message) => {
    console.log(message);

    var element = createElement('div');
    message.data.files.forEach(file => {
        console.log('in')
        element.appendChild(
            CreateFileElement(file)
        );
    });
    document
        .getElementById(FileListElementID)
        .innerHTML = element.innerHTML;

});

function CreateFileElement(file) {
    let element = createElement('div', {
        'class': 'input-group',
    });

    element.appendChild(
        createElement(
            'img',
            {
                'src' : file.thumbnailLink,
                'alt' : 'image_' + file.id
            }
        )
    );

    element.appendChild(
        createElement(
            'button', 
            { 
                'type': 'button',
                'class': 'btn btn-primary',
                'onclick': "SendKey('" + file.id + "','" + file.name + "')"
            },
            'Select'
        )
    );
    
    element.appendChild(
        createElement(
            'div',
            {
                'class': 'form-control',
                'overflow':'hidden',
                'white-space':'nowrap',
                'text-overflow':'ellipsis',
            },
            'Name: ' + file.name
        ),
    );
    return element;
}

function SendKey(id, name) {
    ipc.send('drive-file-key', {id:id,name:name});
    remote.getCurrentWindow().close();
}

