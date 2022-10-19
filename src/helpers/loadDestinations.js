/*
 * File: loadDestinations.js
 * Project: steam-mass-comment-bot
 * Created Date: 23.01.2022 15:28:34
 * Author: 3urobeat
 *
 * Last Modified: 24.01.2022 16:45:14
 * Modified By: 3urobeat
 *
 * Copyright (c) 2022 3urobeat <https://github.com/HerrEurobeat>
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 */


const config          = require("../../config.json");
const steamidResolver = require("steamid-resolver");
const fs              = require("fs");

/**
 * Loads profiles from config and converts them, if necessary, to steamid64
 */
module.exports.loadProfiles = (logger, callback) => {

    var profiles = [];
    var resolverCalls = 0;
    var skipped = [];
    var emptyStr = 0;

    config.profiles.forEach((e) => {
        if (String(e).includes("steamcommunity.com/profiles") || String(e).includes("steamcommunity.com/id")) {
            resolverCalls++;

            setTimeout(() => {
                steamidResolver.customUrlTosteamID64(e, (err, steamID64) => {
                    if (err) {
                        logger("err", `I couldn't get the ID of ${e}. It will be excluded. Error: ${err}`);
                        skipped.push(e);
                    }

                    profiles.push(steamID64);
                });
            }, 500 * resolverCalls);
        } else {
            if (e != "") profiles.push(e);
                else emptyStr++;
        }
    });


    var profileInterval = setInterval(() => {

        if (profiles.length + skipped.length + emptyStr == config.profiles.length) {
            clearInterval(profileInterval);

            // Write result to make it
            config.profiles = profiles;
            skipped.map(e => config.profiles.push(e));

            fs.writeFile("./config.json", JSON.stringify(config, null, 4), (err) => {
                if (err) logger("err", "Error writing resolved profile ids to config: " + err);

                callback(profiles);
            });
        }

    }, 500);
};

/**
 * Loads groups from config and converts them, if necessary, to steamid64
 */
 module.exports.loadGroups = (logger, callback) => {

    var groups = [];
    var resolverCalls = 0;
    var skipped = [];
    var emptyStr = 0;

    config.groups.forEach((e) => {
        if (String(e).includes("steamcommunity.com/groups")) {
            resolverCalls++;

            setTimeout(() => {
                steamidResolver.groupUrlToGroupID64(e, (err, groupID64) => {
                    if (err) {
                        logger("err", `I couldn't get the ID of ${e}. It will be excluded. Error: ${err}`);
                        skipped.push(e);
                    }

                    groups.push(groupID64);
                });
            }, 500 * resolverCalls);
        } else {
            if (e != "") groups.push(e);
                else emptyStr++;
        }
    });


    var groupInterval = setInterval(() => {

        if (groups.length + skipped.length + emptyStr == config.groups.length) {
            clearInterval(groupInterval);

            // Write result to make it
            config.groups = groups;
            skipped.map(e => config.groups.push(e));

            fs.writeFile("./config.json", JSON.stringify(config, null, 4), (err) => {
                if (err) logger("err", "Error writing resolved group ids to config: " + err);

                callback(groups);
            });
        }

    }, 500);

};