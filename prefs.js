import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class ExamplePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        this._addGroup(page, _('Window Switcher'), 'window');
        this._addGroup(page, _('App Switcher'), 'app');
    }

    _addGroup(page, title, settingGroup) {
        let group = new Adw.PreferencesGroup({ title: title });
        page.add(group);

        let choices = new Gtk.StringList();
        choices.append(_('Current'));
        choices.append(_('Primary'));

        this._addRow(group, choices, _('Monitor to show pop-up'), `${settingGroup}-popup`);

        choices = new Gtk.StringList();
        choices.append(_('Current'));
        choices.append(_('All'));

        this._addRow(group, choices, _('Monitor to filter'), `${settingGroup}-filter`);
    }

    _addRow(group, choices, title, setting) {
        const settings = this.getSettings();

        let row = new Adw.ComboRow({
            title: title,
            model: choices,
            selected: settings.get_enum(setting)
        });

        row.connect('notify::selected', widget => {
            settings.set_enum(setting, widget.selected)
        });

        group.add(row);
    }
}