/*
 * File: getQuote.js
 * Project: steam-mass-comment-bot
 * Created Date: 2022-01-25 11:39:11
 * Author: 3urobeat
 *
 * Last Modified: 2024-01-01 18:07:56
 * Modified By: 3urobeat
 *
 * Copyright (c) 2022 - 2024 3urobeat <https://github.com/3urobeat>
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 */


const fs = require("fs");


/**
 * Gets a random quote from comments.txt
 * @param {Function} [callback] Called with `quotes` (Array) on completion.
 */
module.exports.getQuote = (callback) => {
    logger("info", "Loading quotes from comments.txt...", false, true);

    let quotes = [];

    quotes = fs.readFileSync("./comments.txt", "utf8").split("\n"); // Get all quotes from the quotes.txt file into an array
    quotes = quotes.filter(str => str != ""); // Remove empty quotes as empty comments will not work/make no sense

    quotes.forEach((e, i) => { // Multi line strings that contain \n will get splitted to \\n -> remove second \ so that node-steamcommunity understands the quote when commenting
        if (e.length > 999) {
            logger("warn", `The quote.txt line ${i} is longer than the limit of 999 characters. This quote will be ignored for now.`, true, false);
            quotes.splice(i, 1); // Remove this item from the array
            return;
        }

        quotes[i] = e.replace(/\\n/g, "\n").replace("\\n", "\n");

        // Make callback on last iteration
        if (quotes.length <= i + 1) {
            callback(quotes);
        }
    });
};
