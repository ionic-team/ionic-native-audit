'use strict';

import * as fs from 'fs';

export const writeHtml = () => {
    const results = JSON.parse(fs.readFileSync('./results/results.json'));

    let html = '';
    html +=
        '<html>' +
        '<script type="module" src="https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.esm.js"></script>' +
        '<script nomodule src="https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.js"></script>' +
        '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ionic/core/css/ionic.bundle.css"/>';
    html += '<style>'
    html += '.tooltiptext:hover { opacity: 1; position: absolute; z-index: 1; width: 120px; background: #fff; }';
    html += '.tooltiptext { opacity: 0; position: absolute }';
    html += '</style>';
    html += '<ion-header><ion-list><ion-item lines="none">Plugin';
    html += '<ion-buttons slot="end">';
    html += '<ion-button>?</ion-button>';
    html += '<ion-button><ion-icon name="logo-capacitor"></ion-icon></ion-button>';
    html += '<ion-button><ion-icon name="logo-android"></ion-icon></ion-button>';
    html += '<ion-button><ion-icon name="logo-apple"></ion-icon></ion-button>';
    html += '</ion-buttons>';
    html += '</ion-item></ion-list></ion-header>'
    html += '<ion-content>';
    html += '<ion-list>';

    function checkMark(success, text) {
        if (success === undefined) {
            html += `<ion-button color="light">${text}<ion-icon name="close-outline"></ion-icon></ion-button>`;
            return;
        }
        (success) ?
            html += `<ion-button color="primary">${text}<ion-icon color="primary" name="checkmark-outline"></ion-icon></ion-button>` :
            html += `<ion-button color="danger">${text}<ion-icon color="danger" name="close-outline"></ion-icon></ion-button>`;
    }

    for (const name of Object.keys(results)) {
        const plugin = results[name];
        html += `<ion-item><a href="plugin-${name}-errors.txt"><ion-label>${plugin.name}<p>${name}</p></ion-label></a><ion-buttons slot="end">`;
        checkMark(plugin.capacitor.pluginExists, 'Exists');
        checkMark(plugin.capacitor?.ios, 'Capacitor iOS');
        checkMark(plugin.capacitor?.ios, 'Capacitor Android');
        checkMark(plugin.cordova?.ios, 'Cordova iOS');
        checkMark(plugin.cordova?.android, 'Cordova Android');
        html += `</ion-buttons></ion-item>`;
    }

    html += '</ion-list></ion-content></html>';

    fs.writeFileSync('./results/plugins.html', html);
}

