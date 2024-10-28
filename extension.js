import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { WindowSwitcherPopup } from 'resource:///org/gnome/shell/ui/altTab.js';

let original = {};

export default class CurrentMonitorWindowAppSwitcher extends Extension {
    enable() {
        original['_getWindowList'] = WindowSwitcherPopup.prototype._getWindowList;

        WindowSwitcherPopup.prototype._getWindowList = function () {
            let windows = original['_getWindowList'].apply(this, arguments);
            return windows.filter(w => w.get_monitor() === global.display.get_current_monitor());
        };
    }

    disable() {
        WindowSwitcherPopup.prototype._getWindowList = original['_getWindowList'];
    }
}
