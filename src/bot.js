/*
 * File: bot.js
 * Project: steam-mass-comment-bot
 * Created Date: 23.01.2022 13:30:05
 * Author: 3urobeat
 * 
 * Last Modified: 25.01.2022 13:54:25
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

const data = require("./data.json");

var config;
var logininfo;


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


    //Try loading files and show custom error message if unable to do so
    try {
        config = require("../config.json");
    } catch (err) {
        logger("error", `Error trying to read config.json! Did you make a syntax mistake?\n        Please follow the syntax of the template exactly as explained here: https://github.com/HerrEurobeat/steam-mass-comment-bot#setup. Exiting...`, true);
        process.exit(1);
    }

    try {
        logininfo = require("../logininfo.json");
    } catch (err) {
        logger("error", `Error trying to read logininfo.json! Did you make a syntax mistake?\n        Please follow the syntax of the template exactly. Exiting...`, true);
        process.exit(1);
    }
    

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
        logger("", "", true);
        logger("info", "Account logged in!");

        //start playing games if enabled
        if (config.playingGames.length > 0) bot.gamesPlayed(config.playingGames)

        //Get ids
        logger("info", "Getting profile & group ids from URLs in config...", false, true, logger.animation("loading"));

        var loadDestinations = require("./helpers/loadDestinations.js");

        loadDestinations.loadProfiles(logger, (profiles) => { //sorry for the slight callback hell that is now coming
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
                    logger("", `> Logged in as ${logininfo.accountName} and loaded ${profiles.length + groups.length} IDs!`, true);
                    logger("", `> Loaded ${quotes.length} quotes from comments.txt!`, true);
                    logger("", `> Starting to comment in 5 seconds with ${config.commentdelay}ms delay!`, true);
                    logger("", "*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*", true);
                    logger("", "", true);


                    //Start commenting on profiles
                    setTimeout(() => {
                        if (profiles.length > 0) logger("info", `Starting to comment on ${profiles.length} profiles...`);

                        const commentFile = require("./helpers/comment.js");

                        commentFile.commentProfile(profiles, quotes, logger, community, (failedProfiles) => {
                            if (groups.length > 0) logger("info", "Starting to comment on groups...");
                            
                            setTimeout(() => {
                                commentFile.commentGroup(groups, quotes, logger, community, (failedGroups) => {
                                    logger("info", "Finished commenting!\n");
                                    
                                    if (failedProfiles.length > 0) {
                                        logger("info", "Failed profiles: \n" + failedProfiles.join("\n"));
                                        logger("", "", true);
                                    }
                                    if (failedGroups.length   > 0) {
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
}
