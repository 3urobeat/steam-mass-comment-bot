/*
 * File: commentProfile.js
 * Project: steam-mass-comment-bot
 * Created Date: 23.01.2022 16:32:05
 * Author: 3urobeat
 *
 * Last Modified: 25.01.2022 14:05:07
 * Modified By: 3urobeat
 *
 * Copyright (c) 2022 3urobeat <https://github.com/HerrEurobeat>
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 */


const SteamCommunity = require("steamcommunity"); //eslint-disable-line

const config = require("../../config.json");

const randomstring = arr => arr[Math.floor(Math.random() * arr.length)];


/**
 * Comments on all profiles
 * @param {Array} profiles Array of profiles to comment on
 * @param {Array} quotes Array of quotes
 * @param {Function} logger The logger function
 * @param {SteamCommunity} community The SteamCommunity instance
 * @param {function} [callback] Called with `failedGroups` (Array) on completion
 */
module.exports.commentProfile = (profiles, quotes, logger, community, callback) => {
    var failedProfiles = [];

    if (profiles.length == 0) return callback(failedProfiles);

    profiles.forEach((e, i) => {
        setTimeout(() => {
            logger("info", `Commenting on profile ${e}...`, false, false, logger.animation("loading"));

            community.postUserComment(e, randomstring(quotes), (err) => {
                if (err) {
                    logger("warn", `Comment on profile ${e} failed! Error: ${err}`);
                    failedProfiles.push(e);

                    if (err.includes("HTTP error 429") || err.includes("You've been posting too frequently, and can't make another post right now")) {
                        logger("", "", true);
                        logger("error", `Cooldown error detected! Aborting as all other comments from this IP will fail too! Please wait before trying again.\n        All profiles below ${e} have not been processed.`, true);
                        process.exit(1);
                    }
                }

                // Check if we processed all profiles and make a callback
                if (profiles.length == i + 1) callback(failedProfiles);
            });
        }, config.commentdelay * i);
    });
};


/**
 * Comments in all groups
 * @param {Array} groups Array of groups to comment in
 * @param {Array} quotes Array of quotes
 * @param {Function} logger The logger function
 * @param {SteamCommunity} community The SteamCommunity instance
 * @param {function} [callback] Called with `failedGroups` (Array) on completion
 */
 module.exports.commentGroup = (groups, quotes, logger, community, callback) => {
    var failedGroups = [];

    if (groups.length == 0) return callback(failedGroups);

    groups.forEach((e, i) => {
        setTimeout(() => {
            logger("info", `Commenting in group ${e}...`, false, false, logger.animation("loading"));

            community.postGroupComment(e, randomstring(quotes), (err) => {
                if (err) {
                    logger("warn", `Comment in group ${e} failed! Error: ${err}`);
                    failedGroups.push(e);

                    if (err.includes("HTTP error 429") || err.includes("You've been posting too frequently, and can't make another post right now")) {
                        logger("", "", true);
                        logger("error", `Cooldown error detected! Aborting as all other comments from this IP will fail too! Please wait before trying again.\n        All groups below ${e} have not been processed.`, true);
                        process.exit(1);
                    }
                }

                // Check if we processed all profiles and make a callback
                if (groups.length == i + 1) callback(failedGroups);
            });
        }, config.commentdelay * i);
    });
};