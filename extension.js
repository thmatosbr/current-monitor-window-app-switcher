import { Extension, InjectionManager } from 'resource:///org/gnome/shell/extensions/extension.js';
import { AppSwitcherPopup, WindowSwitcherPopup } from 'resource:///org/gnome/shell/ui/altTab.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class CurrentMonitorWindowAppSwitcher extends Extension {
    enable() {
        this._overrider = new Overrider();
        this._overrider.overrideSwitchers();
    }

    disable() {
        this._overrider.destroy();
        this._overrider = null;
    }
}

class Overrider {
    constructor() {
        this._injectionManager = new InjectionManager();
    }

    overrideSwitchers() {
        this._overrideWindowSwitcherPopup();
        this._overrideAppSwitcherPopup();
    }

    destroy() {
        this._injectionManager.clear();
    }

    _overrideWindowSwitcherPopup() {
        this._injectionManager.overrideMethod(WindowSwitcherPopup.prototype,
            '_getWindowList', () => {
                const _getWindowList = WindowSwitcherPopup.prototype._getWindowList;
                return function () {
                    let windows = _getWindowList.apply(this, arguments);

                    return windows.filter(w => w.get_monitor() === global.display.get_current_monitor());
                }
            }
        );

        this._injectionManager.overrideMethod(WindowSwitcherPopup.prototype,
            'vfunc_allocate', () => {
                const vfunc_allocate = WindowSwitcherPopup.prototype.vfunc_allocate;
                return function () {
                    let originalPrimaryMonitor = Main.layoutManager.primaryMonitor;
                    Main.layoutManager.primaryMonitor = Main.layoutManager.currentMonitor;

                    vfunc_allocate.apply(this, arguments);

                    Main.layoutManager.primaryMonitor = originalPrimaryMonitor;
                }
            }
        );
    }

    _overrideAppSwitcherPopup() {
        this._injectionManager.overrideMethod(AppSwitcherPopup.prototype,
            '_init', () => {
                const _init = AppSwitcherPopup.prototype._init;
                return function () {
                    _init.apply(this, arguments);

                    let items = [...this._items];
                    items.forEach(item => {
                        if (!item.cachedWindows.some(w => w.get_monitor() === global.display.get_current_monitor())) {
                            this._switcherList._removeIcon(item.app);
                        }
                    });
                }
            }
        );

        this._injectionManager.overrideMethod(AppSwitcherPopup.prototype,
            'vfunc_allocate', () => {
                const vfunc_allocate = AppSwitcherPopup.prototype.vfunc_allocate;
                return function () {
                    let originalPrimaryMonitor = Main.layoutManager.primaryMonitor;
                    Main.layoutManager.primaryMonitor = Main.layoutManager.currentMonitor;

                    vfunc_allocate.apply(this, arguments);

                    Main.layoutManager.primaryMonitor = originalPrimaryMonitor;
                }
            }
        );
    }
}