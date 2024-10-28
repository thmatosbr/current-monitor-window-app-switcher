import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { AppSwitcherPopup, WindowSwitcherPopup } from 'resource:///org/gnome/shell/ui/altTab.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const Gi = imports._gi;

let original = {};

export default class CurrentMonitorWindowAppSwitcher extends Extension {
    enable() {
        original['_getWindowList'] = WindowSwitcherPopup.prototype._getWindowList;
        original['_init'] = AppSwitcherPopup.prototype._init;
        original['windowSwitcherAllocate'] = WindowSwitcherPopup.prototype.vfunc_allocate;
        original['appSwitcherAllocate'] = AppSwitcherPopup.prototype.vfunc_allocate;

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

        const overrideAllocate = function (proto, originalMethod) {
            proto[Gi.gobject_prototype_symbol][Gi.hook_up_vfunc_symbol](
                'allocate', function () {
                    let originalPrimaryMonitor = Main.layoutManager.primaryMonitor;
                    Main.layoutManager.primaryMonitor = Main.layoutManager.currentMonitor;
                    original[originalMethod].apply(this, arguments);
                    Main.layoutManager.primaryMonitor = originalPrimaryMonitor;
                });
        }

        overrideAllocate(WindowSwitcherPopup.prototype, 'windowSwitcherAllocate');
        overrideAllocate(AppSwitcherPopup.prototype, 'appSwitcherAllocate');
    }

    disable() {
        WindowSwitcherPopup.prototype._getWindowList = original['_getWindowList'];
        AppSwitcherPopup.prototype._init = original['_init'];
        WindowSwitcherPopup.prototype[Gi.gobject_prototype_symbol][Gi.hook_up_vfunc_symbol](
            'allocate', original['windowSwitcherAllocate']);
        AppSwitcherPopup.prototype[Gi.gobject_prototype_symbol][Gi.hook_up_vfunc_symbol](
            'allocate', original['appSwitcherAllocate']);
    }
}
