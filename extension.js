import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { AppSwitcherPopup, WindowSwitcherPopup } from 'resource:///org/gnome/shell/ui/altTab.js';

let original = {};

export default class CurrentMonitorWindowAppSwitcher extends Extension {
    enable() {
        original['_getWindowList'] = WindowSwitcherPopup.prototype._getWindowList;
        original['_init'] = AppSwitcherPopup.prototype._init;

        WindowSwitcherPopup.prototype._getWindowList = function () {
            let windows = original['_getWindowList'].apply(this, arguments);
            return windows.filter(w => w.get_monitor() === global.display.get_current_monitor());
        };

        AppSwitcherPopup.prototype._init = function () {
            original['_init'].apply(this, arguments);

            let items = [...this._items];
            items.forEach(item => {
                if (!item.cachedWindows.some(w => w.get_monitor() === global.display.get_current_monitor())) {
                    this._switcherList._removeIcon(item.app);
                }
            });
        };
    }

    disable() {
        WindowSwitcherPopup.prototype._getWindowList = original['_getWindowList'];
        AppSwitcherPopup.prototype._init = original['_init'];
    }
}
