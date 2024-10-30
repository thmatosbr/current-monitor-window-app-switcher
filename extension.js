import { Extension, InjectionManager } from 'resource:///org/gnome/shell/extensions/extension.js';
import { AppSwitcherPopup, WindowSwitcherPopup } from 'resource:///org/gnome/shell/ui/altTab.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const MonitorPopup = {
    CURRENT: 0,
    PRIMARY: 1,
};

const MonitorFilter = {
    CURRENT: 0,
    ALL: 1,
};

export default class CurrentMonitorWindowAppSwitcher extends Extension {
    enable() {
        this._overrider = new Overrider(this.getSettings());
        this._overrider.overrideSwitchers();
    }

    disable() {
        this._overrider.destroy();
        this._overrider = null;
    }
}

class Overrider {
    constructor(settings) {
        this._settings = settings;
        this._injectionManager = new InjectionManager();
    }

    overrideSwitchers() {
        this._overrideWindowSwitcherPopup();
        this._overrideAppSwitcherPopup();
    }

    destroy() {
        this._injectionManager.clear();
        this._settings = null;
    }

    _overrideWindowSwitcherPopup() {
        this._injectMethod(WindowSwitcherPopup.prototype, '_getWindowList', this._getWindowList());
        this._injectMethod(WindowSwitcherPopup.prototype, 'vfunc_allocate', this._allocate(), 'window-popup');
    }

    _overrideAppSwitcherPopup() {
        this._injectMethod(AppSwitcherPopup.prototype, '_init', this._init());
        this._injectMethod(AppSwitcherPopup.prototype, 'vfunc_allocate', this._allocate(), 'app-popup');
    }

    _injectMethod(proto, methodName, overrideFn, settingName) {
        this._injectionManager.overrideMethod(proto, methodName, () => {
            const originalMethod = proto[methodName];
            return function (...args) {
                return overrideFn.apply(this, [originalMethod, settingName, ...args]);
            };
        });
    }

    _getWindowList() {
        const settings = this._settings;
        return function (originalMethod) {
            const windows = originalMethod.apply(this, arguments);
            return settings.get_enum('window-filter') === MonitorFilter.CURRENT
                ? windows.filter(w => w.get_monitor() === global.display.get_current_monitor())
                : windows;
        };
    }

    _init() {
        const settings = this._settings;
        return function (originalMethod) {
            originalMethod.apply(this, arguments);
            if (settings.get_enum('app-filter') === MonitorFilter.CURRENT) {
                let items = [...this._items];
                items.forEach(item => {
                    if (!item.cachedWindows.some(w => w.get_monitor() === global.display.get_current_monitor()))
                        this._switcherList._removeIcon(item.app);
                });
            }
        };
    }

    _allocate() {
        const settings = this._settings;
        return function (originalMethod, settingName, box) {
            const originalPrimaryMonitor = Main.layoutManager.primaryMonitor;
            if (settings.get_enum(settingName) === MonitorPopup.CURRENT) {
                Main.layoutManager.primaryMonitor = Main.layoutManager.currentMonitor;
            }
            originalMethod.call(this, box);
            Main.layoutManager.primaryMonitor = originalPrimaryMonitor;
        };
    }
}
