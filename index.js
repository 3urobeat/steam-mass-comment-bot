//Customizeable variables:
//Add all profile IDs like this: ["ID1","ID2","ID3"] You can press enter after every comma so that the id's are underneath each other or do it like in the example.
const steamIDsToCommentOn = [
	"ID1",
	"ID2",
	"ID3"
]

//Add just one Comment inside the brackets to only post this specific comment on all profiles.
//Add different comments like ["Comment1","Comment2","Comment3"] to randomly select a comment for each profile.

const comments = ["Comment1","Comment2","Comment3"];

const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const fs = require('fs')

const bot = new SteamUser();
const community = new SteamCommunity();

const logininfo = require('./logininfo.json');
const d = function d() { return new Date(); }
var randomstring = arr => arr[Math.floor(Math.random() * arr.length)];
function logger(string) {
	console.log(string)
	fs.appendFileSync("./output.txt", string + "\n", err => {
        if (err) console.log("error: " + err)
    });
}

const bootstart = d()
const version = "1.0"
const cooldown = 5000;
const steamIDsToCommentOnlength = steamIDsToCommentOn.length;

const logOnOptions = {
  accountName: logininfo.accountName,
  password: logininfo.password,
};

bot.logOn(logOnOptions);

//Startup
bot.on('loggedOn', () => {
	logger(' ')
	logger(' ')
	fs.appendFileSync('./output.txt', 'All IDs: [\n')
	steamIDsToCommentOn.forEach(function(element) {
		fs.appendFileSync('./output.txt', '"' + element + '",\n')
	});
	fs.appendFileSync('./output.txt', ']')
	logger(' ')
	logger('*---------------------*')
	logger('Bot ' + version + ' successfully logged in.');
	logger(d())
	logger('Console output and steamID array can be found in output.txt!')
	const bootend = d() - bootstart
	logger('Ready after ' + bootend + 'ms!')
	logger('*---------------------*')
	logger(' ')
	logger('Waiting ' + cooldown + 'ms between each comment.')
	logger('Starting in 5 seconds...')
	setTimeout(() => {
		logger(' ')

		//Commenting
		steamIDsToCommentOn.forEach((steamID, index) => {
			setTimeout(() => {
				var comment = randomstring(comments)
				logger('Commenting ' + comment + ' on ' + steamID + ' (' + (index + 1) + '/' + steamIDsToCommentOnlength + ')')

				community.postUserComment(steamID, comment, (error) => {
					if(error !== null) {
						logger("postUserComment error: " + error);
						if (error == "Error: HTTP error 429") {
							logger(" ")					
							logger("Skipped remaining accounts because of comment cooldown! You can retry them later!")
							logger('*---------------------*')
							logger("steamID's of failed or skipped comments: [\n")
							steamIDsToCommentOn.forEach(function(element) {
								logger('"' + element + '",\n');
							});
							logger("]")
							logger('*---------------------*')
							logger('Check output.txt! Quitting in 5 seconds...')
							setTimeout(() => {
								process.exit();
							}, 5000)	
						}
					} else {
						steamIDsToCommentOn.shift(); //Remove first entry of array if there were no errors
					}
				});

				if (index >= (steamIDsToCommentOnlength - 1)) {
					logger("Finished commenting!")
					if (steamIDsToCommentOn.length <= 1) {
						logger("There were no failed comments!")
					} else {
						logger("Check output.txt!")
						logger("steamID's of failed or skipped comments: [\n")
						steamIDsToCommentOn.forEach(function(element) {
							logger('"' + element + '",\n');
						});	
						logger("]")
					}
					logger('Quitting in 5 seconds...')
					setTimeout(() => {
						process.exit();
					}, 5000)
				}
			}, cooldown*index);
		});
	}, 5000)
});

bot.on("webSession", (sessionID, cookies) => { 
	community.setCookies(cookies);
});