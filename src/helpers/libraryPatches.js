// Adds support for discussions & sharedfiles until my PRs are merged into the upstream lib
// https://github.com/DoctorMcKay/node-steamcommunity/pulls


const Cheerio = require("cheerio");
const SteamID = require("steamid");

const SteamCommunity = require("steamcommunity");
const Helpers = require("../../node_modules/steamcommunity/components/helpers.js");


const EDiscussionType = {
    "Forum": 0,
    "App": 1,
    "Group": 2,

    // Value-to-name mapping for convenience
    "0": "Forum",
    "1": "App",
    "2": "Group"
};

/**
 * Scrape a discussion's DOM to get all available information
 * @param {string} url - SteamCommunity url pointing to the discussion to fetch
 * @param {Function} callback - First argument is null/Error, second is object containing all available information
 */
SteamCommunity.prototype.getSteamDiscussion = function(url, callback) {
    // Construct object holding all the data we can scrape
    let discussion = {
        id: null,
        type: null,
        appID: null,
        forumID: null,
        gidforum: null, // This is some id used as parameter 2 in post requests
        topicOwner: null, // This is some id used as parameter 1 in post requests
        author: null,
        postedDate: null,
        title: null,
        content: null,
        commentsAmount: null, // I originally wanted to fetch all comments by default but that would have been a lot of potentially unused data
        answerCommentIndex: null
    };

    // Get DOM of discussion
    this.httpRequestGet(url, (err, res, body) => {
        if (err) {
            callback(err);
            return;
        }

        try {

            /* --------------------- Preprocess output --------------------- */

            // Load output into cheerio to make parsing easier
            let $ = Cheerio.load(body);

            // Get breadcrumbs once. Depending on the type of discussion, it either uses "forum" or "group" breadcrumbs
            let breadcrumbs = $(".forum_breadcrumbs").children();

            if (breadcrumbs.length == 0) breadcrumbs = $(".group_breadcrumbs").children();

            // Steam redirects us to the forum page if the discussion does not exist which we can detect by missing breadcrumbs
            if (!breadcrumbs[0]) {
                callback(new Error("Discussion not found"));
                return;
            }


            /* --------------------- Find and map values --------------------- */

            // Determine type from URL as some checks will deviate, depending on the type
            if (url.includes("steamcommunity.com/discussions/forum"))     discussion.type = EDiscussionType.Forum;
            if (/steamcommunity.com\/app\/.+\/discussions/g.test(url))    discussion.type = EDiscussionType.App;
            if (/steamcommunity.com\/groups\/.+\/discussions/g.test(url)) discussion.type = EDiscussionType.Group;


            // Get appID from breadcrumbs if this discussion is associated to one
            if (discussion.type == EDiscussionType.App) {
                let appIdHref = breadcrumbs[0].attribs["href"].split("/");

                discussion.appID = appIdHref[appIdHref.length - 1];
            }


            // Get forumID from breadcrumbs
            let forumIdHref;

            if (discussion.type == EDiscussionType.Group) { // Groups have an extra breadcrumb so we need to shift by 2
                forumIdHref = breadcrumbs[4].attribs["href"].split("/");
            } else {
                forumIdHref = breadcrumbs[2].attribs["href"].split("/");
            }

            discussion.forumID = forumIdHref[forumIdHref.length - 2];


            // Get id, gidforum and topicOwner. The first is used in the URL itself, the other two only in post requests
            let gids = $(".forum_paging > .forum_paging_controls").attr("id").split("_");

            discussion.id = gids[4];
            discussion.gidforum = gids[3];
            discussion.topicOwner = gids[2];


            // Find postedDate and convert to timestamp
            let posted = $(".topicstats > .topicstats_label:contains(\"Date Posted:\")").next().text();

            discussion.postedDate = Helpers.decodeSteamTime(posted.trim());


            // Find commentsAmount
            discussion.commentsAmount = Number($(".topicstats > .topicstats_label:contains(\"Posts:\")").next().text());


            // Get discussion title & content
            discussion.title = $(".forum_op > .topic").text().trim();
            discussion.content = $(".forum_op > .content").text().trim();


            // Find comment marked as answer
            let hasAnswer = $(".commentthread_answer_bar");

            if (hasAnswer.length != 0) {
                let answerPermLink = hasAnswer.next().children(".forum_comment_permlink").text().trim();

                // Convert comment id to number, remove hashtag and subtract by 1 to make it an index
                discussion.answerCommentIndex = Number(answerPermLink.replace("#", "")) - 1;
            }


            // Find author and convert to SteamID object
            let authorLink = $(".authorline > .forum_op_author").attr("href");

            Helpers.resolveVanityURL(authorLink, (err, data) => { // This request takes <1 sec
                if (err) {
                    callback(err);
                    return;
                }

                discussion.author = new SteamID(data.steamID);

                // Make callback when ID was resolved as otherwise owner will always be null
                callback(null, new CSteamDiscussion(this, discussion));
            });

        } catch (err) {
            callback(err, null);
        }
    }, "steamcommunity");
};

/**
 * Constructor - Creates a new Discussion object
 * @class
 * @param {SteamCommunity} community
 * @param {{id: string, appID: string, forumID: string, author: SteamID, postedDate: object, title: string, content: string, commentsAmount: number}} data
 */
function CSteamDiscussion(community, data) {
    /**
     * @type {SteamCommunity}
     */
    this._community = community;

    // Clone all the data we received
    Object.assign(this, data);
}

/**
 * Posts a comment to a discussion
 * @param {string} topicOwner - ID of the topic owner
 * @param {string} gidforum - GID of the discussion's forum
 * @param {string} discussionId - ID of the discussion
 * @param {string} message - Content of the comment to post
 * @param {Function} callback - Takes only an Error object/null as the first argument
 */
SteamCommunity.prototype.postDiscussionComment = function(topicOwner, gidforum, discussionId, message, callback) {
    this.httpRequestPost({
        "uri": `https://steamcommunity.com/comment/ForumTopic/post/${topicOwner}/${gidforum}/`,
        "form": {
            "comment": message,
            "count": 15,
            "sessionid": this.getSessionID(),
            "extended_data": '{"topic_permissions":{"can_view":1,"can_post":1,"can_reply":1}}',
            "feature2": discussionId,
            "json": 1
        },
        "json": true
    }, function(err, response, body) {
        if (!callback) {
            return;
        }

        if (err) {
            callback(err);
            return;
        }

        if (body.success) {
            callback(null);
        } else {
            callback(new Error(body.error));
        }
    }, "steamcommunity");
};



const ESharedFileType = {
    "Screenshot": 0,
    "Artwork": 1,
    "Guide": 2,

    // Value-to-name mapping for convenience
    "0": "Screenshot",
    "1": "Artwork",
    "2": "Guide"
};

/**
 * Scrape a sharedfile's DOM to get all available information
 * @param {string} sharedFileId - ID of the sharedfile
 * @param {Function} callback - First argument is null/Error, second is object containing all available information
 */
SteamCommunity.prototype.getSteamSharedFile = function(sharedFileId, callback) {
    // Construct object holding all the data we can scrape
    let sharedfile = {
        id: sharedFileId,
        type: null,
        appID: null,
        owner: null,
        fileSize: null,
        postDate: null,
        resolution: null,
        uniqueVisitorsCount: null,
        favoritesCount: null,
        upvoteCount: null,
        guideNumRatings: null,
        isUpvoted: null,
        isDownvoted: null
    };

    // Get DOM of sharedfile
    this.httpRequestGet(`https://steamcommunity.com/sharedfiles/filedetails/?id=${sharedFileId}&l=english`, (err, res, body) => { // Request page in english so that the Posted scraping below works
        if (err) {
            callback(err);
            return;
        }

        try {

            /* --------------------- Preprocess output --------------------- */

            // Load output into cheerio to make parsing easier
            let $ = Cheerio.load(body);

            // Dynamically map detailsStatsContainerLeft to detailsStatsContainerRight in an object to make readout easier. It holds size, post date and resolution.
            let detailsStatsObj = {};
            let detailsLeft     = $(".detailsStatsContainerLeft").children();
            let detailsRight    = $(".detailsStatsContainerRight").children();

            Object.keys(detailsLeft).forEach((e) => { // Dynamically get all details. Don't hardcore so that this also works for guides.
                if (isNaN(e)) {
                    return; // Ignore invalid entries
                }

                detailsStatsObj[detailsLeft[e].children[0].data.trim()] = detailsRight[e].children[0].data;
            });

            // Dynamically map stats_table descriptions to values. This holds Unique Visitors and Current Favorites
            let statsTableObj = {};
            let statsTable    = $(".stats_table").children();

            Object.keys(statsTable).forEach((e) => {
                if (isNaN(e)) {
                    return; // Ignore invalid entries
                }

                // Value description is at index 3, value data at index 1
                statsTableObj[statsTable[e].children[3].children[0].data] = statsTable[e].children[1].children[0].data.replace(/,/g, ""); // Remove commas from 1k+ values
            });


            /* --------------------- Find and map values --------------------- */

            // Find appID in share button onclick event
            sharedfile.appID = Number($("#ShareItemBtn").attr()["onclick"].replace(`ShowSharePublishedFilePopup( '${sharedFileId}', '`, "").replace("' );", ""));


            // Find fileSize if not guide
            sharedfile.fileSize = detailsStatsObj["File Size"] || null; // TODO: Convert to bytes? It seems like to always be MB but no guarantee


            // Find postDate and convert to timestamp
            let posted = detailsStatsObj["Posted"] || null; // Set to null if "posted" could not be found as Steam translates dates and parsing it below will return a wrong result

            if (posted) {
                sharedfile.postDate = Helpers.decodeSteamTime(posted.trim()); // Only parse if posted is defined to avoid errors
            }


            // Find resolution if artwork or screenshot
            sharedfile.resolution = detailsStatsObj["Size"] || null;


            // Find uniqueVisitorsCount. We can't use ' || null' here as Number("0") casts to false
            if (statsTableObj["Unique Visitors"]) {
                sharedfile.uniqueVisitorsCount = Number(statsTableObj["Unique Visitors"]);
            }


            // Find favoritesCount. We can't use ' || null' here as Number("0") casts to false
            if (statsTableObj["Current Favorites"]) {
                sharedfile.favoritesCount = Number(statsTableObj["Current Favorites"]);
            }


            // Find upvoteCount. We can't use ' || null' here as Number("0") casts to false
            let upvoteCount = $("#VotesUpCountContainer > #VotesUpCount").text();

            if (upvoteCount) {
                sharedfile.upvoteCount = Number(upvoteCount);
            }


            // Find numRatings if this is a guide as they use a different voting system
            let numRatings = $(".ratingSection > .numRatings").text().replace(" ratings", "");

            sharedfile.guideNumRatings = Number(numRatings) || null; // Set to null if not a guide or if the guide does not have enough ratings to show a value


            // Determine if this account has already voted on this sharedfile
            sharedfile.isUpvoted   = String($(".workshopItemControlCtn > #VoteUpBtn")[0].attribs["class"]).includes("toggled");   // Check if upvote btn class contains "toggled"
            sharedfile.isDownvoted = String($(".workshopItemControlCtn > #VoteDownBtn")[0].attribs["class"]).includes("toggled"); // Check if downvote btn class contains "toggled"


            // Determine type by looking at the second breadcrumb. Find the first separator as it has a unique name and go to the next element which holds our value of interest
            let breadcrumb = $(".breadcrumbs > .breadcrumb_separator").next().get(0) || $(".breadcrumbs").get(0).children[1]; // Some artworks only have one breadcrumb like "username's Artwork" so let's check that as a backup

            if (breadcrumb) { // If neither could be found then leave type at null
                if (breadcrumb.children[0].data.includes("Screenshot")) {
                    sharedfile.type = ESharedFileType.Screenshot;
                }

                if (breadcrumb.children[0].data.includes("Artwork")) {
                    sharedfile.type = ESharedFileType.Artwork;
                }

                if (breadcrumb.children[0].data.includes("Guide")) {
                    sharedfile.type = ESharedFileType.Guide;
                }
            }


            // Find owner profile link, convert to steamID64 using SteamIdResolver lib and create a SteamID object
            let ownerHref = $(".friendBlockLinkOverlay").attr()["href"];

            Helpers.resolveVanityURL(ownerHref, (err, data) => { // This request takes <1 sec
                if (err) {
                    callback(err);
                    return;
                }

                sharedfile.owner = new SteamID(data.steamID);

                // Make callback when ID was resolved as otherwise owner will always be null
                callback(null, new CSteamSharedFile(this, sharedfile));
            });

        } catch (err) {
            callback(err, null);
        }
    }, "steamcommunity");
};

/**
 * Constructor - Creates a new SharedFile object
 * @class
 * @param {SteamCommunity} community
 * @param {{id: string, type: ESharedFileType, appID: number, owner: SteamID | null, fileSize: string | null, postDate: number, resolution: string | null, uniqueVisitorsCount: number, favoritesCount: number, upvoteCount: number | null, guideNumRatings: number | null, isUpvoted: boolean, isDownvoted: boolean}} data
 */
function CSteamSharedFile(community, data) {
    /**
     * @type {SteamCommunity}
     */
    this._community = community;

    // Clone all the data we received
    Object.assign(this, data);
}

/**
 * Posts a comment to a sharedfile
 * @param {SteamID | string} userID - ID of the user associated to this sharedfile
 * @param {string} sharedFileId - ID of the sharedfile
 * @param {string} message - Content of the comment to post
 * @param {Function} callback - Takes only an Error object/null as the first argument
 */
SteamCommunity.prototype.postSharedFileComment = function(userID, sharedFileId, message, callback) {
    if (typeof userID === "string") {
        userID = new SteamID(userID);
    }

    this.httpRequestPost({
        "uri": `https://steamcommunity.com/comment/PublishedFile_Public/post/${userID.toString()}/${sharedFileId}/`,
        "form": {
            "comment": message,
            "count": 10,
            "json": 1,
            "sessionid": this.getSessionID()
        },
        "json": true
    }, function(err, response, body) {
        if (!callback) {
            return;
        }

        if (err) {
            callback(err);
            return;
        }

        if (body.success) {
            callback(null);
        } else {
            callback(new Error(body.error));
        }
    }, "steamcommunity");
};
