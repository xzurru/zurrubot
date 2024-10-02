# HaZe

Discord Bot Setup and Features
1. Prerequisites
Before running your bot, you need to install a few dependencies and set up your environment. Here's what you need:

1.1 Install Node.js
The bot is written in Node.js, so make sure you have the latest version installed. You can download Node.js from https://nodejs.org/.

1.2 Install Required Libraries
After installing Node.js, you'll need to install some additional libraries. Run this command in your project folder:

bash
npm install discord.js discord-player dotenv fs
These libraries are essential for:

discord.js: Interacts with Discord's API to allow the bot to send messages, manage channels, and more.
discord-player: Handles music playback features for the bot.
dotenv: Manages environment variables, helping you securely store the bot token.
fs: Provides access to the file system, allowing the bot to read and write data (e.g., for saving user levels).
1.3 Create a .env File
Create a .env file in your project directory and add your bot's token like this:

makefile
TOKEN=your_discord_bot_token
2. Features of the Bot
Your bot includes several core features:

2.1 Music Commands
/play [song]: Plays a song based on a name or URL. The bot searches for the song, adds it to the queue, and plays it in the user's voice channel.
/stop: Stops the current song and clears the queue.
2.2 Moderation Commands
/kick [user]: Kicks a user from the server.
/ban [user]: Bans a user from the server.
/warn [user] [reason]: Issues a warning to a user. Warnings are stored and can be reviewed.
/clear [amount]: Deletes a specified number of messages from the chat.
2.3 User Leveling System
The bot tracks users' activity in voice channels and awards experience points (XP) based on the time spent in voice chats. When users gain enough XP, they level up.

XP and Level Tracking: Tracks how long a user stays in a voice channel and awards XP accordingly.
Level Up Notifications: The bot sends a message to a designated channel when a user levels up.
2.4 Welcome and Role Assignment
When a new user joins the server, the bot automatically assigns roles and sends a welcome message in a specific channel.
2.5 Bad Word Detection
The bot has a list of inappropriate words. If a user sends a message containing one of these words, the message is automatically deleted, and the user receives a warning.

2.6 Help Command
/help: Provides users with information about the available commands.
3. Starting the Bot
Once you've set everything up, you can start the bot with the following command:

bash
node index.js
The bot will log in using the token you stored in the .env file and will be ready to start interacting in your server.

4. Summary of Necessary Files
index.js: The main bot file that contains all the logic and features.
leveling.json: A file used to store user XP and levels.
warns.json: A file that tracks user warnings.
This setup guide should get your bot running with its full functionality! Let me know if you need further clarification or adjustments.
