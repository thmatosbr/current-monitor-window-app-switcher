import { Extension, InjectionManager } from 'resource:///org/gnome/shell/extensions/extension.js';
import { AppSwitcherPopup, WindowSwitcherPopup } from 'resource:///org/gnome/shell/ui/altTab.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const DetectionMethod = {
    FOCUSED_WINDOW: 0,
    MOUSE_POSITION: 1,
};
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

function get_current_monitor(detectionMethod) {
    if(detectionMethod === DetectionMethod.FOCUSED_WINDOW) {
        const focused_window = global.display.get_focus_window();
        if (focused_window !== null) {
            return focused_window.get_monitor();
        }
    }
    return global.display.get_current_monitor();
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
        this._injectMethod(WindowSwitcherPopup.prototype, 'vfunc_allocate', this._allocate(), 'window');
    }

    _overrideAppSwitcherPopup() {
        this._injectMethod(AppSwitcherPopup.prototype, '_init', this._init());
        this._injectMethod(AppSwitcherPopup.prototype, 'vfunc_allocate', this._allocate(), 'app');
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
                ? windows.filter(w => w.get_monitor() === get_current_monitor(settings.get_enum('window-method')))
                : windows;
        };
    }

    _init() {
        const settings = this._settings;
        return function (originalMethod) {
            originalMethod.apply(this, arguments);
            if (settings.get_enum('app-filter') === MonitorFilter.CURRENT) {
                const currentMonitor = get_current_monitor(settings.get_enum('app-method'));
                let items = [...this._items];
                items.forEach(item => {
                    item.cachedWindows = item.cachedWindows.filter(
                        w => w.get_monitor() === currentMonitor
                    );
                    if (item.cachedWindows.length === 0) {
                        this._switcherList._removeIcon(item.app);
                    } else if (item.cachedWindows.length === 1) {
                        const iconIndex = this._switcherList.icons.indexOf(item);
                        if (iconIndex !== -1 && this._switcherList._arrows[iconIndex])
                            this._switcherList._arrows[iconIndex].hide();
                    }
                });
            }
        };
    }

    _allocate() {
        const settings = this._settings;
        return function (originalMethod, settingGroup, box) {
            const originalPrimaryMonitor = Main.layoutManager.primaryMonitor;
            if (settings.get_enum(`${settingGroup}-popup`) === MonitorPopup.CURRENT) {
                Main.layoutManager.primaryMonitor =
                    Main.layoutManager.monitors[get_current_monitor(settings.get_enum(`${settingGroup}-method`))];
            }
            originalMethod.call(this, box);
            Main.layoutManager.primaryMonitor = originalPrimaryMonitor;
        };
    }
}
