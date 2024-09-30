# Hazebot
1. Welcome System and Role Assignment
Welcome Message: When a new user joins the server, the bot sends a personalized welcome message to a designated channel (e.g., #welcome). This message is in Russian and includes the user's name and profile picture.

Role Assignment: The bot automatically assigns two predefined roles to the new member as they join the server. This can help in managing permissions and organizing users.

2. Leveling System
Experience Points (XP): Users gain XP by sending messages and spending time in voice channels. The bot tracks this XP and stores it in a JSON file.

Level Up: When a user accumulates enough XP to reach a new level, the bot notifies them and sends a message in a specific channel (e.g., #level-ups) announcing their new level.

3. Voice Channel Tracking
XP Gain in Voice Channels: Users gain XP for each minute spent in voice channels, incentivizing them to engage in voice chats.
4. Music Bot Features
Play Command: Users can request songs by using the !play <song name> command. The bot searches for the requested song on platforms like YouTube and plays it in the user's current voice channel.

Stop Command: Users can stop the music with the !stop command.

Skip Command: Users can skip the currently playing track using the !skip command.

5. Moderation Tools
Kick Command: Moderators can kick users from the server using the !kick @user command.

Ban Command: Moderators can ban users from the server using the !ban @user command.

Clear Command: Moderators can delete a specified number of messages in a channel using the !clear <number> command.

6. Error Handling
The bot is designed to handle various errors gracefully. For example, it checks if the user is in a voice channel before attempting to play music, and it ensures commands are only executed in server messages to prevent issues when users send messages in DMs.

Summary
Overall, this Discord bot serves as a multifaceted tool for server management, enhancing user engagement through welcome messages, leveling systems, music playback, and moderation capabilities. It encourages interaction among users while allowing moderators to manage the community effectively.
