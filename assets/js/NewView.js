const { dialog } = require('electron').remote;
var ffmpeg_static = require('ffmpeg-static');
var fluent_ffmpeg = require('fluent-ffmpeg');
fluent_ffmpeg.setFfmpegPath(ffmpeg_static.path);

const supportedImageFormats = ["jpeg", "png", "bmp", "tiff", "gif"];
const supportedVideoFormats = ["avi", "mp4"];
const supportedAudioFormats = [];

if(typeof($.fn.popover) != 'undefined') {
    console.log("Bootstrap")
}

function GetLocalFile(elementName) {
    let filePath = dialog.showOpenDialog({properties: ["openFile"]});
    let element = document.getElementById(elementName);

    element.title = filePath[0];
    element.value = filePath[0].slice(filePath[0].lastIndexOf("\\") + 1);
}

function SaveLocalFile(elementName) {
    let filePath = dialog.showSaveDialog();
    let element = document.getElementById(elementName);

    element.title = filePath;
    element.value = filePath.slice(filePath.lastIndexOf("\\") + 1);
}

function ConvertVideo(source, destination, format) {
    let proc = fluent_ffmpeg(source)
        .toFormat(format)
        .on('end', () => { console.log('file has been converted succesfully'); })
        .on('error', (err) => { console.log('an error happened: ' + err.message); })
        .save(destination);
}

function ConvertVideoButton() {
    let input = document.getElementById('newInputBox').title;
    let operation = document.getElementById('newOperationBox').value;
    let output = document.getElementById('newOutputBox').title;

    output += '.' + operation;

    console.log({input, operation, output});

    if (input.slice(input.lastIndexOf('.')) != operation)
        ConvertVideo(input, output, operation);
}