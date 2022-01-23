/*
 * File: bot.js
 * Project: steam-mass-comment-bot
 * Created Date: 23.01.2022 13:30:05
 * Author: 3urobeat
 * 
 * Last Modified: 23.01.2022 16:37:43
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
    logger("info", "Logging in...", false, false, logger.animation("loading"));

    bot.logOn({
        accountName: logininfo.accountName,
        password: logininfo.password
    })

    bot.on("loggedOn", () => {
        logger("info", "Account logged in!");

        //start playing games if enabled
        if (config.playingGames.length > 0) bot.gamesPlayed(config.playingGames)

        //Get ids
        logger("info", "Getting profile & group ids from URLs in config...", false, true, logger.animation("loading"));

        var loadDestinations = require("./helpers/loadDestinations.js");

        loadDestinations.loadProfiles(logger, (profiles) => {
            loadDestinations.loadGroups(logger, (groups) => {

                logger("", "\n", true);
                logger("*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*", true);
                logger("", `Logged in and loaded ${profiles.length + groups.length} IDs!`, true);
                logger("", `Starting to comment in 5 seconds with ${config.commentdelay}ms delay!`)
                logger("*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*", true);
                logger("", "\n", true);

            })
        })
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
        
    })
}
