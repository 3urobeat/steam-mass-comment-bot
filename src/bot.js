/*
 * File: bot.js
 * Project: steam-mass-comment-bot
 * Created Date: 2022-01-23 13:30:05
 * Author: 3urobeat
 *
 * Last Modified: 2024-01-02 13:15:43
 * Modified By: 3urobeat
 *
 * Copyright (c) 2022 - 2024 3urobeat <https://github.com/3urobeat>
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 */


const logger         = require("output-logger");
const SteamUser      = require("steam-user");
const SteamCommunity = require("steamcommunity");
const SteamID        = require("steamid");

const sessionHandler = require("./sessions/sessionHandler.js");
const data           = require("./data.json");

let config;
let logininfo;


/**
 * Starts the bot, logs in and starts commenting
 */
module.exports.run = async () => {

    // Configure my logging library (https://github.com/3urobeat/output-logger#options-1)
    logger.options({
        msgstructure: `[${logger.Const.ANIMATION}] [${logger.Const.DATE} | ${logger.Const.TYPE}] ${logger.Const.MESSAGE}`,
        paramstructure: [logger.Const.TYPE, logger.Const.MESSAGE, "nodate", "remove", logger.Const.ANIMATION],
        outputfile: "./output.txt",
        animationdelay: 250
    });

    global.logger = logger; // Make logger accessible in sessionHandler


    const bot       = new SteamUser();
    const community = new SteamCommunity();

    // Load my library patches
    require("./helpers/libraryPatches.js");


    // Print startup messages
    logger("", "\n", true);
    logger("info", `Starting steam-mass-comment-bot v${data.version} by 3urobeat`, true);
    logger("", "---------------------------------------------------------\n", true);


    // Try loading files and show custom error message if unable to do so
    try {
        config = require("../config.json");
    } catch (err) {
        logger("error", "Error trying to read config.json! Did you make a syntax mistake?\n        Please follow the syntax of the template exactly as explained here: https://github.com/3urobeat/steam-mass-comment-bot#setup. Exiting...", true);
        process.exit(1);
    }

    try {
        logininfo = require("../logininfo.json");
    } catch (err) {
        logger("error", "Error trying to read logininfo.json! Did you make a syntax mistake?\n        Please follow the syntax of the template exactly. Exiting...", true);
        process.exit(1);
    }


    // Display commentdelay warning message if too low
    if (config.commentdelay < 5000) logger("warn", "I strongly advise not setting the commentdelay below 5000ms!\n       You might be running in danger of getting banned for spamming or will at least get a cooldown rather quickly.");
    if (config.commentdelay <= 500) {
        logger("error", "Your commentdelay is way to low! This will either give you a cooldown instantly or outright ban you for spamming! Aborting...");
        process.exit(1);
    }


    // Start logging in
    logger("info", "Logging in...", false, false);

    let session = new sessionHandler(bot, logininfo.accountName, 0, { accountName: logininfo.accountName, password: logininfo.password });
    let token = await session.getToken();
    if (!token) process.exit(1); // Exit if no token could be retrieved

    bot.logOn({ refreshToken: token });


    // Attach steam-user loggedOn event
    bot.on("loggedOn", async () => {
        logger("", "", true);
        logger("info", "Account logged in!");

        // Start playing games if enabled
        if (config.playingGames.length > 0) bot.gamesPlayed(config.playingGames);


        // Get IDs
        logger("info", "Getting profile & group ids from URLs in config...", false, true, logger.animation("loading"));

        const { loadProfiles, loadGroups } = require("./helpers/loadDestinations.js");

        const profiles = await loadProfiles();
        const groups   = await loadGroups();


        require("./helpers/getQuote.js").getQuote((quotes) => {

            // Check if nothing was found to comment on
            if (profiles.length == 0 && groups.length == 0) {
                logger("error", "No profiles and groups found to comment on/in! Exiting...");
                process.exit(1);
            }

            // Check if no quotes were provided
            if (quotes.length == 0) {
                logger("error", "No comments found in comments.txt! Please provide messages I can choose from in comments.txt! Exiting...");
                process.exit(1);
            }

            // Show ready message
            logger("", "", true);
            logger("", "*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*", true);
            logger("", `> Logged in as ${logininfo.accountName}!`, true);
            logger("", `> Loaded ${profiles.length} profile IDs and ${groups.length} group IDs!`, true)
            logger("", `> Loaded ${quotes.length} quotes from comments.txt!`, true);
            logger("", `> Starting to comment in 5 seconds with ${config.commentdelay}ms delay!`, true);
            logger("", "*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*", true);
            logger("", "", true);


            // Start commenting on profiles
            setTimeout(() => {
                if (profiles.length > 0) logger("info", `Starting to comment on ${profiles.length} profiles...`);

                const commentFile = require("./helpers/comment.js");

                commentFile.commentProfile(profiles, quotes, community, (failedProfiles) => {
                    if (groups.length > 0) logger("info", "Starting to comment on groups...");

                    setTimeout(() => {
                        commentFile.commentGroup(groups, quotes, community, (failedGroups) => {
                            logger("info", "Finished commenting!\n");

                            if (failedProfiles.length > 0) {
                                logger("info", "Failed profiles: \n" + failedProfiles.join("\n"));
                                logger("", "", true);
                            }
                            if (failedGroups.length > 0) {
                                logger("info", "Failed groups: \n" + failedGroups.join("\n"));
                                logger("", "", true);
                            }

                            logger("info", "Exiting...");
                            process.exit(0);
                        });
                    }, config.commentdelay);
                });
            }, 5000);
        });

    });


    // Set cookies to be able to comment later
    bot.on("webSession", (sessionID, cookies) => {
        community.setCookies(cookies);
    });


    // Respond with afkMessage if enabled in config
    bot.chat.on("friendMessage", (msg) => {
        let message = msg.message_no_bbcode;
        let steamID = msg.steamid_friend;
        let steamID64 = new SteamID(String(steamID)).getSteamID64();

        logger("info", `Friend message from ${steamID64}: ${message}`);

        if (config.afkMessage.length > 0) {
            logger("info", "Responding with: " + config.afkMessage);

            bot.chat.sendFriendMessage(steamID, config.afkMessage);
        }

    });
};
