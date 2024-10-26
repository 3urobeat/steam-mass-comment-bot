/*
 * File: checkForUpdate.js
 * Project: steam-mass-comment-bot
 * Created Date: 2024-10-26 16:53:01
 * Author: 3urobeat
 *
 * Last Modified: 2024-10-26 16:58:10
 * Modified By: 3urobeat
 *
 * Copyright (c) 2024 3urobeat <https://github.com/3urobeat>
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

const https = require("https");


/**
 * Checks if an update is available from the GitHub repository and logs a message
 */
module.exports.checkForUpdate = function() {
    logger("info", "Checking for an available update...", false, true, logger.animation("loading"));

    let output = "";

    try {
        const localVersion = require("../../package.json").version;

        const req = https.get("https://raw.githubusercontent.com/3urobeat/steam-mass-comment-bot/master/package.json", function(res) {
            res.setEncoding("utf8");

            res.on("data", (chunk) => {
                output += chunk;
            });

            res.on("end", () => {
                output = JSON.parse(output);
                const onlineVersion = output.version;

                if (onlineVersion && onlineVersion != localVersion) {
                    logger("", "", true);
                    logger("", `${logger.colors.fggreen}Update available!${logger.colors.reset} Your version: ${logger.colors.fgred}${localVersion}${logger.colors.reset} | New version: ${logger.colors.fggreen}${onlineVersion}`, true);
                    logger("", "", true);
                    logger("", `Download it here and transfer your accounts.txt, config.json & proxies.txt:\n${logger.colors.fgcyan}${logger.colors.underscore}https://github.com/3urobeat/steam-mass-comment-bot/archive/refs/heads/master.zip`, true);
                    logger("", "", true);
                }
            });
        });

        req.on("error", function(err) {
            logger("warn", `${logger.colors.reset}[${logger.colors.fgred}Notice${logger.colors.reset}]: Couldn't check for an available update because either GitHub is down or your internet isn't working.\n          Error: ${err}`, true);
        });
    } catch (err) {
        logger("error", "Failed to check for an update: " + err, true);
    }
};
