/* eslint class-methods-use-this:, no-unused-vars: */

/* service.js
 *
 * Copyright 2021 Martin Abente Lahaye
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

imports.gi.versions.Gtk = '3.0';

const {Gio, GLib, Gtk} = imports.gi;

const PermissionsIface = `
<node xmlns:doc="http://www.freedesktop.org/dbus/1.0/doc.dtd">
    <interface name="org.freedesktop.impl.portal.PermissionStore">
        <method name="List">
            <arg type="s" name="table" direction="in"/>
            <arg type="as" name="ids" direction="out"/>
        </method>
        <method name="Lookup">
            <arg type="s" name="table" direction="in"/>
            <arg type="s" name="id" direction="in"/>
            <arg type="a{sas}" name="permissions" direction="out"/>
            <arg type="v" name="data" direction="out"/>
        </method>
        <method name="SetPermission">
            <arg type="s" name="table" direction="in"/>
            <arg type="b" name="create" direction="in"/>
            <arg type="s" name="id" direction="in"/>
            <arg type="s" name="app" direction="in"/>
            <arg type="as" name="permissions" direction="in"/>
        </method>
        <property name="version" type="u" access="read"/>
    </interface>
</node>
`;


class MockPermissionsStore {
    constructor() {
        this._store = {
            background: {
                background: {},
            },
            notifications: {
                notification: {},
            },
            devices: {
                speakers: {},
                microphone: {},
                camera: {},
            },
            location: {
                location: {},
            },
        };

        this._version = new GLib.Variant('u', 2);
        this._dbusId = null;
        this._nameId = Gio.bus_own_name(
            Gio.BusType.SESSION,
            'com.github.tchx84.Flatseal.PermissionStore',
            Gio.BusNameOwnerFlags.NONE,
            this._onBusAcquired.bind(this),
            null,
            null,
        );
    }

    _onBusAcquired(connection, name) {
        const info = Gio.DBusNodeInfo.new_for_xml(PermissionsIface);
        const activationId = connection.register_object(
            '/org/freedesktop/impl/portal/PermissionStore',
            info.interfaces[0],
            this._onCalled.bind(this),
            this._onProperty.bind(this),
            null,
        );

        if (activationId <= 0)
            throw new Error('activationId is ZERO');
    }

    _onCalled(connection, sender, path, iface, method, params, invocation) {
        if (method === 'Lookup') {
            const [table, id] = params.deep_unpack();

            const data = new GLib.Variant('b', true);
            const permissions = new GLib.Variant('(a{sas}v)', [this._store[table][id], data]);

            invocation.return_value(permissions);
        } else if (method === 'SetPermission') {
            const [table, create, id, appId, permissions] = params.deep_unpack();

            this._store[table][id][appId] = permissions;

            invocation.return_value(null);
        } else if (method === 'List') {
            var ids = [];
            const [table] = params.deep_unpack();

            if (table in this._store)
                ids = Object.keys(this._store[table]);

            const value = new GLib.Variant('(as)', [ids]);
            invocation.return_value(value);
        }
    }

    _onProperty(connection, sender, path, iface, key) {
        return this._version;
    }

    shutdown() {
        Gio.bus_unown_name(this._nameId);
    }
}

Gtk.init(null);

const service = new MockPermissionsStore();

Gtk.main();
