/*
 * File: bot.js
 * Project: steam-mass-comment-bot
 * Created Date: 23.01.2022 13:30:05
 * Author: 3urobeat
 * 
 * Last Modified: 25.01.2022 12:07:36
 * Modified By: 3urobeat
 * 
 * Copyright (c) 2022 3urobeat <https://github.com/HerrEurobeat>
 * 
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>. 
 */


const logger         = require("output-logger");
const SteamUser      = require("steam-user");
const SteamCommunity = require("steamcommunity");
const SteamID        = require("steamid");

const logininfo = require("../logininfo.json");
const config    = require("../config.json");
const data      = require("./data.json");


/**
 * Starts the bot, logs in and starts commenting
 */
module.exports.run = () => {

    //Configure my logging library (https://github.com/HerrEurobeat/output-logger#options-1)
    logger.options({
        msgstructure: `[${logger.Const.ANIMATION}] [${logger.Const.DATE} | ${logger.Const.TYPE}] ${logger.Const.MESSAGE}`,
        paramstructure: [logger.Const.TYPE, logger.Const.MESSAGE, "nodate", "remove", logger.Const.ANIMATION],
        outputfile: "./output.txt",
        animationdelay: 250
    })

    
    const bot		= new SteamUser();
    const community = new SteamCommunity();

    logger("", "\n", true);
    logger("info", `Starting steam-mass-comment-bot v${data.version} by 3urobeat`, true);
    logger("", "---------------------------------------------------------\n", true);


    //Display commentdelay warning message if too low
    if (config.commentdelay < 5000) logger("warn", "I strongly advise not setting the commentdelay below 5000ms!\n       You might be running in danger of getting banned for spamming or will at least get a cooldown rather quickly.")
    if (config.commentdelay <= 500) {
        logger("error", "Your commentdelay is way to low! This will either give you a cooldown instantly or outright ban you for spamming! Aborting...");
        process.exit(1);
    }


    //Start logging in
    logger("info", "Logging in...", false, false);

    bot.logOn({
        accountName: logininfo.accountName,
        password: logininfo.password
    })

    bot.on("loggedOn", () => {
        logger("info", "\nAccount logged in!");

        //start playing games if enabled
        if (config.playingGames.length > 0) bot.gamesPlayed(config.playingGames)

        //Get ids
        logger("info", "Getting profile & group ids from URLs in config...", false, true, logger.animation("loading"));

        var loadDestinations = require("./helpers/loadDestinations.js");

        loadDestinations.loadProfiles(logger, (profiles) => {
            loadDestinations.loadGroups(logger, (groups) => {
                require("./helpers/getQuote.js").getQuote(logger, (quotes) => {

                    //Check if nothing was found to comment on
                    if (profiles.length == 0 && groups.length == 0) {
                        logger("error", "No profiles and groups found to comment on/in! Exiting...");
                        process.exit(1);
                    }

                    //Check if no quotes were provided
                    if (quotes.length == 0) {
                        logger("error", "No comments found in comments.txt! Please provide messages I can choose from in comments.txt! Exiting...");
                        process.exit(1);
                    }

                    //Show ready message
                    logger("", "", true);
                    logger("", "*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*", true);
                    logger("", `> Logged in and loaded ${profiles.length + groups.length} IDs!`, true);
                    logger("", `> Loaded ${quotes.length} quotes from comments.txt!`, true);
                    logger("", `> Starting to comment in 5 seconds with ${config.commentdelay}ms delay!`, true);
                    logger("", "*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*", true);
                    logger("", "", true);


                    //Start commenting on profiles
                    setTimeout(() => {
                        if (profiles.length > 0) logger("info", `Starting to comment on ${profiles.length} profiles...`);

                        handleProfileComments(profiles, quotes, (failedProfiles) => {
                            if (groups.length > 0) logger("info", "Starting to comment on groups...");
                            
                            handleGroupComments(groups, quotes, (failedGroups) => {
                                logger("info", "Finished commenting!\n");
                                
                                if (failedProfiles.length > 0) logger("info", "Failed profiles: " + failedProfiles.join("\n"));
                                if (failedGroups.length   > 0) logger("info", "\nFailed groups: " + failedGroups.join("\n"));
        
                                logger("info", "Exiting...");
                            });
                        });
                    }, 5000);
                });
            });
        });
    });

    
    //Set cookies to be able to comment later
    bot.on("webSession", (sessionID, cookies) => { 
        community.setCookies(cookies);
    });


    //Respond with afkMessage if enabled in config
    bot.on('friendMessage', (steamID, message) => {
        var steamID64 = new SteamID(String(steamID)).getSteamID64()

        logger("info", `Friend message from ${steamID64}: ${message}`)

        if (config.afkMessage.length > 0) {
            logger("info", "Responding with: " + config.afkMessage)

            bot.chat.sendFriendMessage(steamID, config.afkMessage)
        }
        
    });


    /**
     * Handles commenting on all profiles
     * @param {Array} profiles Array of profiles to comment on
     * @param {Array} quotes Array of quotes
     */
    function handleProfileComments(profiles, quotes, callback) {
        var failedProfiles = [];

        if (profiles.length == 0) return callback(failedProfiles);

        profiles.forEach((e, i) => {
            setTimeout(() => {
                logger("info", `Commenting on profile ${e}...`, false, false, logger.animation("loading"));

                require("./helpers/commentGroup.js").commentGroup(e, quotes, (err) => {
                    if (err) {
                        logger("warn", `Comment in group ${e} failed! Error: ${err}`)
                        failedProfiles.push(e);
                    }

                    //Check if we processed all profiles and make a callback
                    if (profiles.length == i + 1) callback(failedProfiles);
                })
            }, config.commentdelay * i);
        });
    }


    /**
     * Handles commenting in all groups
     * @param {Array} groups Array of groups to comment in
     * @param {Array} quotes Array of quotes
     */
    function handleGroupComments(groups, quotes, callback) {
        var failedGroups = [];

        if (groups.length == 0) return callback(failedGroups);

        groups.forEach((e, i) => {
            setTimeout(() => {
                logger("info", `Commenting in group ${e}...`, false, false, logger.animation("loading"));

                require("./helpers/commentGroup.js").commentGroup(e, quotes, (err) => {
                    if (err) {
                        logger("warn", `Comment in group ${e} failed! Error: ${err}`)
                        failedGroups.push(e);
                    }

                    //Check if we processed all profiles and make a callback
                    if (groups.length == i + 1) callback(failedGroups);
                })
            }, config.commentdelay * i);
        });
    }
}
