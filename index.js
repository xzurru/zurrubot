const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js'); 
const { Player } = require('discord-player');
const { YouTubeExtractor } = require('discord-player-youtubei'); // Correctly import
const fs = require('fs');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// Initialize the Player
const player = new Player(client);

// Register the YouTubeExtractor
try {
    const youtubeExtractor = new YouTubeExtractor();
    player.extractors.register(youtubeExtractor);
    console.log('YouTubeExtractor registered successfully');
} catch (error) {
    console.error('Error registering YouTubeExtractor:', error);
}

// Logging for registered extractors
console.log('Registered Extractors:', player.extractors);

// Load leveling data
let levelingData;
try {
    levelingData = require('./leveling.json');
} catch (error) {
    console.error('Error loading leveling.json, initializing with an empty object.');
    levelingData = {};
    saveLevelingData(); // Save empty object
}

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

// Voice channel tracking: Join and leave times
const voiceTimes = new Map();

client.on('voiceStateUpdate', (oldState, newState) => {
    const userId = newState.id;

    // If a user joins a voice channel
    if (!oldState.channelId && newState.channelId) {
        voiceTimes.set(userId, Date.now()); // Store join time
    }

    // If a user leaves the voice channel
    if (oldState.channelId && !newState.channelId) {
        const joinTime = voiceTimes.get(userId);
        if (!joinTime) return;

        const timeSpent = Date.now() - joinTime; // Time spent in voice channel
        const xpGain = Math.floor(timeSpent / 60000); // 1 XP per minute

        // Add XP to the user
        if (!levelingData[userId]) {
            levelingData[userId] = { xp: 0, level: 1 };
        }

        levelingData[userId].xp += xpGain;
        voiceTimes.delete(userId); // Remove user from map as they left

        // Check for level-up and save data
        checkLevelUp(userId, newState.guild);
        saveLevelingData();
    }
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

// Single messageCreate event handler
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const args = message.content.trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // --- Leveling system --- 
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

    // --- Command processing --- 
    // Music commands
    if (command === '!play') {
        const song = args.join(' ');
        if (!song) return message.channel.send('Please provide a song name or URL.');

        const queue = player.nodes.create(message.guild, {
            metadata: {
                channel: message.channel,
                client: client,
                requestedBy: message.author,
            },
            selfDeaf: true,
            volume: 80,
            leaveOnEnd: false,
            leaveOnEmpty: true,
            leaveOnEmptyCooldown: 300000,
        });

        try {
            if (!queue.connection) await queue.connect(message.member.voice.channel);
        } catch (error) {
            console.error(error);
            player.nodes.delete(message.guild.id);
            return message.channel.send('I could not join your voice channel!');
        }

        try {
            const track = await player.search(song, { requestedBy: message.author }).then(x => x.tracks[0]);
            if (!track) throw new Error('No results found.');

            queue.addTrack(track);
            if (!queue.node.isPlaying()) await queue.node.play();

            message.channel.send(`Now playing: **${track.title}**`);
        } catch (error) {
            console.error(error);
            message.channel.send('An error occurred while trying to play the song.');
        }
    }

    if (command === '!stop') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue || !queue.node.isPlaying()) return message.reply('No music is currently playing.');
        queue.delete();
        message.reply('Music stopped.');
    }

    if (command === '!skip') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue || !queue.node.isPlaying()) return message.reply('No music is currently playing.');
        queue.node.skip();
        message.reply('Track skipped.');
    }

    // Moderation commands
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;

    if (command === '!kick') {
        const member = message.mentions.members.first();
        if (!member) return message.reply('Please mention a user to kick.');
        if (!member.kickable) return message.reply('I cannot kick this user.');
        member.kick().then(() => {
            message.reply(`${member.user.tag} was kicked.`);
        }).catch(err => {
            message.reply('I couldn’t kick the user.');
            console.error(err);
        });
    }

    if (command === '!ban') {
        const member = message.mentions.members.first();
        if (!member) return message.reply('Please mention a user to ban.');
        if (!member.bannable) return message.reply('I cannot ban this user.');
        member.ban().then(() => {
            message.reply(`${member.user.tag} was banned.`);
        }).catch(err => {
            message.reply('I couldn’t ban the user.');
            console.error(err);
        });
    }
});

// Bot login
client.login(process.env.TOKEN);
