/*
 * File: bot.js
 * Project: steam-mass-comment-bot
 * Created Date: 2022-01-23 13:30:05
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


// Don't judge this code too hard, it is slapped together quite loosely.
// Check out my main project instead: https://github.com/3urobeat/steam-comment-service-bot

const logger         = require("output-logger");
const SteamUser      = require("steam-user");
const SteamCommunity = require("steamcommunity");
const SteamID        = require("steamid");
const EResult        = SteamUser.EResult;

const { checkForUpdate } = require("./helpers/checkForUpdate.js");
const sessionHandler     = require("./sessions/sessionHandler.js");
const data               = require("./data.json");

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
        animationdelay: 250,
        printdebug: false
    });

    global.logger = logger; // Make logger accessible in sessionHandler


    const bot       = new SteamUser({ renewRefreshTokens: true });
    const community = new SteamCommunity();

    // Load my library patches
    require("./helpers/libraryPatches.js");


    // Print startup messages
    logger("", "\n", true);
    logger("info", `Starting steam-mass-comment-bot v${data.version} by 3urobeat`, true);
    logger("", "---------------------------------------------------------\n", true);

    // Check for an update
    checkForUpdate();


    // Try loading files and show custom error message if unable to do so
    try {
        config = require("../config.json");
    } catch (err) {
        logger("error", `Failed to read config.json! Did you make a syntax mistake?\n        Please follow the syntax of the template exactly as explained here: https://github.com/3urobeat/steam-mass-comment-bot#setup.\n        ${err}\n        Exiting...`, true);
        process.exit(1);
    }

    try {
        logininfo = require("../logininfo.json");
    } catch (err) {
        logger("error", `Failed to read logininfo.json! Did you make a syntax mistake?\n        Please follow the syntax of the template exactly.\n        ${err}\n        Exiting...`, true);
        process.exit(1);
    }


    // Display commentdelay warning message if too low
    if (config.commentdelay < 5000) logger("warn", "I strongly advise not setting the commentdelay below 5000ms!\n       You might be running in danger of getting banned for spamming or will at least get a cooldown rather quickly.", true);
    if (config.commentdelay <= 500) {
        logger("error", "Your commentdelay is way too low! This will either give you a cooldown instantly or outright ban you for spamming! Aborting...");
        process.exit(1);
    }


    // Start logging in
    let session;

    /**
     * Attempts to log this account in
     */
    async function login() {
        logger("info", "Logging in...", false, false);

        session   = new sessionHandler(bot, logininfo.accountName, 0, { accountName: logininfo.accountName, password: logininfo.password });
        const token = await session.getToken();

        if (!token) process.exit(1); // Exit if no token could be retrieved

        bot.logOn({ refreshToken: token });
    }

    login();


    // Attach steam-user loggedOn event
    bot.on("loggedOn", async () => {
        logger("", "", true);
        logger("info", "Account logged in!");

        // Start playing games if enabled
        if (config.playingGames.length > 0) bot.gamesPlayed(config.playingGames);


        // Get IDs
        logger("info", "Loading comment destinations from destinations.txt...", false, true, logger.animation("loading"));

        const { loadDestinations } = require("./helpers/loadDestinations.js");
        const destinations = await loadDestinations();

        if (destinations.length == 0) {
            logger("error", "No valid destinations found to comment on! Exiting...");
            process.exit(1);
        }


        const { getQuote } = require("./helpers/getQuote.js");

        getQuote((quotes) => {

            // Check if no quotes were provided
            if (quotes.length == 0) {
                logger("error", "No comments found in comments.txt! Please provide messages I can choose from in comments.txt! Exiting...");
                process.exit(1);
            }

            // Show ready message
            logger("", "", true);
            logger("", "*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*", true);
            logger("", `> Logged in as ${logininfo.accountName}!`, true);
            logger("", `> Found ${destinations.length} destinations in config!`, true);
            logger("", `> Loaded ${quotes.length} quotes from comments.txt!`, true);
            logger("", `> Starting to comment in 5 seconds with ${config.commentdelay}ms delay!`, true);
            logger("", "*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*", true);
            logger("", "", true);


            // Create a new 0% progress bar when the loop below starts
            setTimeout(() => logger.createProgressBar(), config.commentdelay);


            // Start commenting
            const { comment } = require("./helpers/comment.js");

            const failed = [];
            let http429err = false;

            destinations.forEach((e, i) => {
                setTimeout(() => {
                    if (http429err) return; // Block further executions if true

                    comment(e, quotes, community, (err) => {
                        if (err) {
                            failed.push(e.raw);

                            if (String(err).includes("HTTP error 429") || String(err).includes("You've been posting too frequently, and can't make another post right now")) {
                                logger("", "", true);
                                logger("error", "Cooldown error detected! Aborting as all other comments from this IP will fail too! Please wait before trying again.\n        Exiting in 5 seconds...", true);

                                http429err = true;
                                setTimeout(() => process.exit(1), 5000);
                            }
                        }

                        // Calculate progress and update progress bar
                        logger.setProgressBar((i + 1) / destinations.length * 100);

                        // Print result on the last iteration
                        if (i + 1 == destinations.length) {
                            logger("info", "Finished commenting!\n");

                            if (failed.length > 0) {
                                logger("info", "Failed: \n" + failed.join("\n"));
                                logger("", "", true);
                            }

                            logger("info", "Exiting in 5 seconds...");
                            setTimeout(() => process.exit(0), 5000);
                        }
                    });
                }, config.commentdelay * (i + 1)); // + 1 to delay the first iteration as well
            });

        });

    });


    // Set cookies to be able to comment later
    bot.on("webSession", (sessionID, cookies) => {
        community.setCookies(cookies);
    });


    // Respond with afkMessage if enabled in config
    bot.chat.on("friendMessage", (msg) => {
        const message = msg.message_no_bbcode;
        const steamID = msg.steamid_friend;
        const steamID64 = new SteamID(String(steamID)).getSteamID64();
        const username = bot.users[steamID64].player_name;

        logger("info", `Friend message from '${username}' (${steamID64}): ${message}`);

        // Respond with afk message if enabled in config
        if (config.afkMessage.length > 0) {
            logger("info", "Responding with: " + config.afkMessage);

            bot.chat.sendFriendMessage(steamID, config.afkMessage);
        }
    });


    // Emitted when refreshToken is auto-renewed by SteamUser
    bot.on("refreshToken", (newToken) => {
        logger("info", "SteamUser auto renewed this refresh token, updating database entry...");

        session._saveTokenToStorage(newToken);
    });


    // Handles a login error
    bot.on("error", (err) => {
        // Invalidate token to get a new session if this error was caused by an invalid refreshToken
        if (err.eresult == EResult.InvalidPassword || err.eresult == EResult.AccessDenied || err == "Error: InvalidSignature") { // These are the most likely enums that will occur when an invalid token was used I guess (Checking via String here as it seems like there are EResults missing)
            logger("debug", "Token login error: Calling SessionHandler's _invalidateTokenInStorage() function to get a new session when retrying this login attempt");

            if (err.eresult == EResult.AccessDenied) logger("warn", "Detected an AccessDenied login error! This is usually caused by an invalid login token. Deleting login token, please re-submit your Steam Guard code.");

            session.invalidateTokenInStorage();

            setTimeout(() => login(), 5000);
            return;
        }

        logger("error", `[${this.logOnOptions.accountName}] Error logging in! ${err}`);
    });
};
