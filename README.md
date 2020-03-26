<div align="center">
	<h1 align="center">~ Steam Mass Comment Bot ~</h1>
	<strong>Comment with a few clicks under a bunch of profiles!</strong><br />See how to set up the bot and customize it below.<br /><br />
</div>

**If you want, you can donate a few bucks on my [Patreon](https://www.patreon.com/3urobeat)! I would really appreciate it!**

This bot features two customizeable arrays/lists, one for all steamIDs of the profiles were the bot will comment and one for a selection of comments.  
You can either choose to leave the same comment under each profile or select a random comment for each profile.  
Continue reading for a detailed setup guide.  

## Requirements

- `node` (https://nodejs.org)

Only necessary if you want to download via command prompt:
- `git` command line ([Windows](https://git-scm.com/download/win)|[Linux](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)|[MacOS](https://git-scm.com/download/mac)) installed

## Downloading

Click here: [Download](https://github.com/HerrEurobeat/steam-bots/archive/master.zip)  
Extract the zip and open the `mass-comment-bot` folder.

## Setting the bot up

Rename the `logininfo.json.example` to `logininfo.json`.  
Open the file with a text editor and fill out the user name and password brackets with your steam login data.  

**The login data will _only_ be used to leave comments under the profiles of the provided steamIDs with one of the provided comments.**

Open `index.js` with a text editor. At the top of the file will be two arrays/lists, called `steamIDsToCommentOn` and `comments`.  
Fill out the two arrays like explained in the comments above the two arrays.  

The bot is now setup. It will work through the steamIDs from top to bottom and leave a comment on each profile with a delay of 5 seconds.  
This delay shouldn't get you a cooldown from steam for too many comments but if it will happen the bot will stop and give you an array of all remaining/failed profiles. You can retry them later.  
Everything in the console will be saved to output.txt!  

## Starting the bot

To start the bot, double click run.bat on windows or open a command prompt or power shell and navigate to the bot folder and type:  
`node index.js`

If you have the Steam Guard enabled, the bot will ask for your authenticator code.  
The bot will now start and you should see him starting to work!  

If a error should happen it will be saved in the output.txt. You can open a new issue on GitHub and post the error with description here.  
