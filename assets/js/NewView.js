const { dialog } = require('electron').remote
var ffmpeg = require('ffmpeg');

const supportedImageFormats = ["jpeg", "png", "bmp", "tiff", "gif"];
const supportedVideoFormats = [];
const supportedAudioFormats = [];

if(typeof($.fn.popover) != 'undefined'){
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