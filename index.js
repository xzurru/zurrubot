const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { Player } = require('discord-player');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates // For voice channel activities and music
    ]
});

const player = new Player(client, {
    ytdlOptions: {
        filter: "audioonly"
    }
});

// Load leveling data
let levelingData = require('./leveling.json');

// Function to save leveling data
function saveLevelingData() {
    fs.writeFile('./leveling.json', JSON.stringify(levelingData, null, 2), (err) => {
        if (err) console.log(err);
    });
}

// Bot ready event
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Welcome message and role assignment
client.on('guildMemberAdd', (member) => {
    const role1 = member.guild.roles.cache.get('1284519960143462584');
    const role2 = member.guild.roles.cache.get('1287132493547569192');

    if (role1 && role2) {
        member.roles.add([role1, role2])
            .then(() => console.log(`Roles successfully assigned to ${member.user.tag}`))
            .catch(console.error);
    }

    const welcomeChannel = member.guild.channels.cache.get('1284517411005005948');
    if (welcomeChannel) {
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Welcome to the server!')
            .setDescription(`Hello, ${member.user.username}, welcome to the server! We are glad to have you! 🎉`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setFooter({ text: 'We hope you enjoy your time here!' });

        welcomeChannel.send({ embeds: [welcomeEmbed] });
    }
});

// Track voice channel join and leave times
const voiceTimes = new Map();

client.on('voiceStateUpdate', (oldState, newState) => {
    const userId = newState.id;

    // If a user joins a voice channel
    if (!oldState.channelId && newState.channelId) {
        voiceTimes.set(userId, Date.now()); // Store the join time
    }

    // If a user leaves a voice channel
    if (oldState.channelId && !newState.channelId) {
        const joinTime = voiceTimes.get(userId);
        if (!joinTime) return;

        const timeSpent = Date.now() - joinTime; // Time spent in the voice channel
        const xpGain = Math.floor(timeSpent / 60000); // 1 XP per minute

        // Add XP to the user
        if (!levelingData[userId]) {
            levelingData[userId] = { xp: 0, level: 1 };
        }

        levelingData[userId].xp += xpGain;
        voiceTimes.delete(userId); // Remove the user from the map as they left the channel

        // Check for level-up and save data
        checkLevelUp(userId, newState.guild);
        saveLevelingData();
    }
});

// Grant XP based on messages
client.on('messageCreate', (message) => {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;

    // Initialize leveling data for a new user
    if (!levelingData[userId]) {
        levelingData[userId] = { xp: 0, level: 1 };
    }

    // Add random XP for messages
    const xpGain = Math.floor(Math.random() * 10) + 1;
    levelingData[userId].xp += xpGain;

    // Check for level-up and save data
    checkLevelUp(userId, message.guild);
    saveLevelingData();
});

// Function to check and notify for level-up
function checkLevelUp(userId, guild) {
    const userData = levelingData[userId];
    const xpForNextLevel = 5 * Math.pow(userData.level, 2);

    if (userData.xp >= xpForNextLevel) {
        userData.level += 1;
        userData.xp = 0; // Reset XP

        // Notification in a specific channel
        const levelUpChannel = guild.channels.cache.get('1284633527580885092'); // Replace with your channel ID
        if (levelUpChannel) {
            const levelUpEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`🎉 Level Up!`)
                .setDescription(`<@${userId}> has reached level ${userData.level}!`)
                .setThumbnail(guild.members.cache.get(userId).user.displayAvatarURL({ dynamic: true }));

            levelUpChannel.send({ embeds: [levelUpEmbed] });
        }
    }
}

// Music bot commands
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const args = message.content.split(' ');

    const command = args[0].toLowerCase(); // Define the command

    // Play music
    if (command === '!play') {
        const song = args.slice(1).join(' ');
        const queue = player.createQueue(message.guild.id);

        try {
            if (!queue.connection) await queue.connect(message.member.voice.channel);
        } catch (error) {
            console.error(error);
            return message.channel.send('I could not join the voice channel.');
        }

        const track = await player.search(song, {
            requestedBy: message.author
        }).then(x => x.tracks[0]);

        if (!track) return message.channel.send('No results found.');

        queue.addTrack(track);
        if (!queue.playing) await queue.play();

        message.channel.send(`Now playing: **${track.title}**`);
    }

    // Stop music
    if (command === '!stop') {
        const queue = player.getQueue(message.guild.id);
        if (!queue) return message.reply('No music is currently playing.');
        queue.destroy();
        message.reply('Music stopped.');
    }

    // Skip music
    if (command === '!skip') {
        const queue = player.getQueue(message.guild.id);
        if (!queue || !queue.playing) return message.reply('No music is currently playing.');
        queue.skip();
        message.reply('Track skipped.');
    }
});

// Moderation commands
client.on('messageCreate', (message) => {
    if (!message.guild || !message.member) return; // Ensure the message comes from a server, not DM
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;

    const args = message.content.split(' ');

    // Kick command
    if (args[0] === '!kick') {
        const member = message.mentions.members.first();
        if (!member) return message.reply('Please mention a user.');
        member.kick().then(() => {
            message.reply(`${member.user.tag} was kicked.`);
        }).catch(err => {
            message.reply('I couldn’t kick the user.');
            console.error(err);
        });
    }

    // Ban command
    if (args[0] === '!ban') {
        const member = message.mentions.members.first();
        if (!member) return message.reply('Please mention a user.');
        member.ban().then(() => {
            message.reply(`${member.user.tag} was banned.`);
        }).catch(err => {
            message.reply('I couldn’t ban the user.');
            console.error(err);
        });
    }

    // Clear messages command
    if (args[0] === '!clear') {
        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) return message.reply('Please provide a valid number.');
        message.channel.bulkDelete(amount, true).catch(err => {
            message.reply('There was an error clearing messages.');
            console.error(err);
        });
    }
});

client.login(process.env.TOKEN);
