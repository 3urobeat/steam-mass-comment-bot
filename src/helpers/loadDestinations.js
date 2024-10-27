/*
 * File: loadDestinations.js
 * Project: steam-mass-comment-bot
 * Created Date: 2022-01-23 15:28:34
 * Author: 3urobeat
 *
 * Last Modified: 2024-10-27 10:38:29
 * Modified By: 3urobeat
 *
 * Copyright (c) 2022 - 2024 3urobeat <https://github.com/3urobeat>
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 */


const fs              = require("fs");
const SteamID         = require("steamid");
const steamIDResolver = require("steamid-resolver");

const config = require("../../config.json");


// This is a slimmed down version of this function from my steam-comment-service-bot: https://github.com/3urobeat/steam-comment-service-bot/blob/master/src/controller/helpers/handleSteamIdResolving.js
/**
 * Handles converting URLs to steamIDs and determining their type
 * Note: For discussions only type checking/determination is supported and you need to provide a full URL.
 * @param {string} str The profileID argument provided by the user
 * @param {function(string|null, string|null, string|null): void} callback Called with `err` (String or null), `steamID64` (String or null), `idType` (String or null) parameters on completion
 */
function handleSteamIdResolving(str, callback) {

    // Instantly callback nothing if nothing was provided
    if (!str) return callback(null, null);

    // "profile", "group" or "sharedfile" - Is populated before making callback
    let idType;

    // Function to handle steamIDResolver callbacks as they are always roughly the same. Only call for profile & group!
    function handleResponse(err, res) { //eslint-disable-line
        logger("debug", `handleSteamIdResolving: handleResponse(): Received callback from steamid-resolver. err: ${err} | res: ${res}`);

        // Check if resolving failed
        if (err) return callback(err, null, null);

        // Quickly determine type. We know that the ID here must be valid and of type profile or group as sharedfile is recognized as invalid by SteamID
        idType = new SteamID(res).type == SteamID.Type.INDIVIDUAL ? "profile" : "group";

        callback(null, res, idType);
    }

    // Try to figure out if user provided an steamID64 or a customURL or a whole profile link
    if (isNaN(str) || !new SteamID(str).isValid()) { // If not a number or invalid SteamID. Note: Sharedfile IDs are considered invalid.
        if (str.includes("steamcommunity.com/id/")) {
            logger("debug", "handleSteamIdResolving: User provided customURL profile link...");

            steamIDResolver.customUrlToSteamID64(str, handleResponse);

        } else if (str.includes("steamcommunity.com/profiles/")) {
            logger("debug", "handleSteamIdResolving: User provided steamID64 profile link...");

            // My library doesn't have a check if exists function nor returns the steamID64 if I pass it into steamID64ToCustomUrl(). But since I don't want to parse the URL myself here I'm just gonna request the full obj and cut the id out of it
            steamIDResolver.steamID64ToFullInfo(str, (err, obj) => handleResponse(err, obj.steamID64[0]));

        } else if (str.includes("steamcommunity.com/discussions/forum") || /steamcommunity.com\/app\/.+\/discussions/g.test(str) || /steamcommunity.com\/groups\/.+\/discussions/g.test(str)) {
            logger("debug", "handleSteamIdResolving: User provided discussion link...");

            idType = "discussion";

            callback(null, str, idType);

        } else if (str.includes("steamcommunity.com/groups/")) { // Must be below the discussion check because of the "groups/abc/discussion" regex above
            logger("debug", "handleSteamIdResolving: User provided group link...");

            steamIDResolver.groupUrlToGroupID64(str, handleResponse);

        } else if (str.includes("steamcommunity.com/sharedfiles/filedetails/?id=")) {
            logger("debug", "handleSteamIdResolving: User provided sharedfile link...");

            // Check if ID is valid
            steamIDResolver.isValidSharedfileID(str, (err, res) => {
                if (err) return callback(err, null, null);
                if (!res) return callback("The specified sharedfile could not be found", null, null);

                // Cut domain away
                const split = str.split("/");
                if (split[split.length - 1] == "") split.pop(); // Remove trailing slash (which is now a space because of split("/"))

                str = split[split.length - 1].replace("?id=", "");

                // Update idType
                idType = "sharedfile";

                callback(null, str, idType);
            });

        } else { // Doesn't seem to be an URL. We can ignore discussions as we need to provide an URL to SteamCommunity.

            logger("debug", "handleSteamIdResolving: Trying to figure out what has been provided...");

            steamIDResolver.customUrlToSteamID64(str, (err, steamID64) => { // Check profile first, as it will probably be used more often
                if (err) {
                    logger("debug", "handleSteamIdResolving: profile id check returned an error. Trying group id check...");

                    steamIDResolver.groupUrlToGroupID64(str, (err, groupID) => {
                        if (err) {
                            logger("debug", "handleSteamIdResolving: group id check returned an error. Trying sharedfile id check...");

                            steamIDResolver.isValidSharedfileID(str, (err, isValid) => {
                                if (err || !isValid) {
                                    logger("debug", "handleSteamIdResolving: sharedfile id check also returned an error! Resolving with error as something unknown was provided: " + str);
                                    handleResponse("ID parameter seems to be invalid.", null);

                                } else {

                                    logger("debug", "handleSteamIdResolving: the provided id seems to be a sharedfile id! Returning sharedfileID...");

                                    if (str.includes("steamcommunity.com/")) { // Check if full URL was provided and cut domain away
                                        const split = str.split("/");
                                        if (split[split.length - 1] == "") split.pop(); // Remove trailing slash (which is now a space because of split("/"))

                                        str = split[split.length - 1].replace("?id=", "");
                                    }

                                    // Update idType
                                    idType = "sharedfile";

                                    callback(null, str, idType);
                                }
                            });

                        } else {
                            logger("debug", "handleSteamIdResolving: the provided id seems to be a group id! Returning groupID...");
                            handleResponse(null, groupID);
                        }
                    });

                } else {
                    logger("debug", "handleSteamIdResolving: the provided id seems to be a profile id! Returning steamID64...");
                    handleResponse(null, steamID64);
                }
            });

        }

    } else {

        logger("debug", "handleSteamIdResolving: I don't need to convert anything as user seems to have already provided an steamID64. Cool!");

        // Quickly determine type. We know that the ID here must be valid and of type profile or group as sharedfile is recognized as invalid by SteamID
        idType = new SteamID(str).type == SteamID.Type.INDIVIDUAL ? "profile" : "group";

        handleResponse(null, str, idType);
    }

}


/**
 * Loads all destinations from the config, determines type and converts them to steamID64
 * @returns {Promise.<Array.<{ raw: string, processed: string, type: "profile" | "group" | "sharedfile" | "discussion" }>>} Resolves with an array of objects for every destination
 */
module.exports.loadDestinations = function() {
    return new Promise((resolve) => {

        // Load destinations from file
        let destinations = [];

        if (!fs.existsSync("./destinations.txt")) {
            resolve([]);
        } else { // File does seem to exist so now we can try and read it
            destinations = fs.readFileSync("./destinations.txt", "utf8").split("\n");
            destinations = destinations.filter(str => str != ""); // Remove empty lines

            if (destinations.length > 0 && destinations[0].startsWith("//Comment")) destinations = destinations.slice(1); // Remove comment from array

            // Check if no proxies were found (can only be the case when useLocalIP is false)
            if (destinations.length == 0) {
                logger("", "", true);
                logger("error", "No destinations set in destinations.txt to comment on! Exiting...", true);
                return process.exit(1);
            }
        }


        // Convert any destinations that need to be converted to IDs
        let failed  = 0;
        const results = [];

        destinations.forEach((e, i) => {
            setTimeout(() => {

                // Check for duplicate entry to avoid unneccessary resolving if possible
                const existingEntry = results.find((f) => f.raw == e);

                if (existingEntry) {
                    logger("debug", `loadDestination(): Found duplicate entry for '${e}', using it instead of resolving entry again...`);

                    results.push({
                        raw: e,
                        processed: existingEntry.processed,
                        type: existingEntry.type
                    });

                    // Resolve if done
                    if (results.length + failed == destinations.length) resolve(results);

                    return;
                }

                // Resolve entry
                handleSteamIdResolving(e, (err, id, type) => {
                    if (err) {
                        logger("error", `Failed to resolve destination '${e}', ignoring it. ${err}`);
                        failed++;
                    } else {
                        results.push({
                            raw: e,
                            processed: id,
                            type: type
                        });
                    }

                    // Resolve if done
                    if (results.length + failed == destinations.length) resolve(results);
                });

            }, config.destinationResolveDelay * i);
        });

    });
};
