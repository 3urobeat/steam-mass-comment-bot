<div align="center" markdown=1>
	<p align="center"><img width=45% src="https://3urobeat.com/comment-bot/steamLogo.png"></p>
	<strong>Comment with a few clicks under a ton of steam profiles & groups!</strong>
	<br>See how to set up the bot and customize it below.<br>
	<p></p>
</div>

<div align="center">

[![nodejs](https://img.shields.io/badge/node.js-v14-brightgreen)](https://nodejs.org/)
[![Star](https://img.shields.io/badge/-Give%20this%20repo%20a%20star!-yellow)](https://github.com/3urobeat/steam-mass-comment-bot)
[![Steam Group](https://img.shields.io/badge/Steam%20Group-Join!-blue)](https://steamcommunity.com/groups/3urobeatGroup)
[![Donate](https://img.shields.io/badge/donate-%241-orange)](https://paypal.me/3urobeat)
<p align="center">Click on a badge to learn more.</p>

</div>

&nbsp;

**Disclaimer!**  
> I, the developer, am not responsible and cannot be held liable for what you do with this bot.  
> Please don't misuse this bot by spamming or posting malicious comments. Your accounts can get banned from Steam if you do that.  
  
&nbsp;

## **Download:**
Click here: [Download](https://github.com/3urobeat/steam-mass-comment-bot/archive/master.zip)  
Extract the zip and open the `steam-mass-comment-bot` folder.  
  
You need to have at least node.js version 14.15.0 installed: [Download](https://nodejs.org)  
To check your version number if you already have node installed, type `node --version` in your console or terminal.  

&nbsp;

## **Setup:**

Open `logininfo.json` with a text editor and fill in the username and password of your account into the provided brackets.  
Save and exit.

**The login data will _only_ be used to leave comments under the profiles and groups set in `config.json` with one of the provided comments in `comments.txt`.**

Open `config.json` with a text editor.  
Put in the profile links or steamID64s you want to comment on into the `profiles` array.  
Put in the group links or steamID64s you want to comment in into the `groups` array.  
  
Make sure you are following this syntax when filling the arrays:  
```
"profiles": [
	"ID1",
	"steamcommunity.com/id/name2",
	"https://steamcommunity.com/profiles/ID3"
]
```  

Take a look below at *Troubleshooting* if you experience issues.  

If you want to set a custom status and play games when running the bot, fill in the `playingGames` array in the config.  
The array works like this: `["custom game text", game id, game id]`  
Empty the array (like this `"playingGames": []`) if the bot should not change your online appearance.  
  
If the bot should respond with a message if someone messages you while the bot is running, set a message as `afkMessage`.  
Empty the brackets (like this `"afkMessage": ""`) to disable the feature.  

The `commentdelay` value sets the time in ms the bot should wait between comments. I suggest leaving it at the default value.  
Setting it too low will result in cooldown errors because Steam considers your account as spamming.  
Should you recieve cooldown errors with the default values, increase the value and try again.  

&nbsp;  

## **Starting the bot:**

Please open a console window or terminal in the current folder.  
Run the command `npm install` and wait for it to complete. This will install al necessary packages for the bot.  

When done, type `node index.js` to start the bot.  
It should log into your account, ask for a Steam Guard code if necessary, and start commenting on each profile and group you set in `config.json` after eachother.  
  
If you are on Windows and don't know how to open a console window in the current folder:  
- Open the folder of the bot with your Explorer  
- Click on the blue `File` button in in the top left  
- Click on the `Open PowerShell` or `Open CMD` entry and a console window should appear

&nbsp;

## **Troubleshooting:**

If you don't follow the syntax from above you will get an error because the bot is unable to read the file.  
If you are getting a syntax mistake error then check for these common mistakes:  
- forgot to add a comma to the end of the line?
- the very last line must not have a comma (look at the example above)
- forgot brackets `"` when writing something?  

&nbsp;  
If you get another error or have questions, please [open an issue here](https://github.com/3urobeat/steam-mass-comment-bot/issues/new).  
Everything that appears in your console/terminal window will also be saved to the `output.txt` file. Please attach the content of your last run to your issue to make it easier for me to troubleshoot.  

