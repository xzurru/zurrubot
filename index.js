const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');  
const { Player } = require('discord-player');
const { YouTubeExtractor } = require('discord-player-youtubei');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

// Player initialisieren
const player = new Player(client);

// YouTubeExtractor registrieren
try {
    const youtubeExtractor = new YouTubeExtractor();
    player.extractors.register(youtubeExtractor);
} catch (error) {
    console.error('Error registering YouTubeExtractor:', error);
}

// Level-Daten laden
let levelingData;
try {
    levelingData = require('./leveling.json');
} catch (error) {
    console.error('Error loading leveling.json, initializing with an empty object.');
    levelingData = {};
    saveLevelingData();
}

// Warn-Daten laden
let warnsData;
try {
    warnsData = require('./warns.json');
} catch (error) {
    console.error('Error loading warns.json, initializing with an empty object.');
    warnsData = {};
    saveWarnsData();
}

// Funktion zum Speichern der Level-Daten
function saveLevelingData() {
    fs.writeFile('./leveling.json', JSON.stringify(levelingData, null, 2), (err) => {
        if (err) console.error(err);
    });
}

// Funktion zum Speichern der Warn-Daten
function saveWarnsData() {
    fs.writeFile('./warns.json', JSON.stringify(warnsData, null, 2), (err) => {
        if (err) console.error(err);
    });
}

// Bot bereit-Event
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Logging-Kanäle
const logChannelId = '1284977972528283658'; // Ersetze durch deine Kanal-ID
const warnChannelId = '1290375280283750441'; // Ersetze durch deine Warn-Kanal-ID

// Willkommensnachricht und Rollenzuweisung
client.on('guildMemberAdd', (member) => {
    const role1 = member.guild.roles.cache.get('1284519960143462584');
    const role2 = member.guild.roles.cache.get('1287132493547569192');

    if (role1 && role2) {
        member.roles.add([role1, role2]).catch(console.error);
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

    // Loggen der Mitgliedszugänge
    logActivity(`User joined: ${member.user.tag}`);
});

// Sprachkanal-Tracking: Beitritts- und Verlassenszeiten
const voiceTimes = new Map();

client.on('voiceStateUpdate', (oldState, newState) => {
    const userId = newState.id;

    // Wenn ein Benutzer einem Sprachkanal beitritt
    if (!oldState.channelId && newState.channelId) {
        voiceTimes.set(userId, Date.now()); // Beitrittszeit speichern
        logActivity(`User joined voice channel: <@${userId}>`);
    }

    // Wenn ein Benutzer den Sprachkanal verlässt
    if (oldState.channelId && !newState.channelId) {
        const joinTime = voiceTimes.get(userId);
        if (!joinTime) return;

        const timeSpent = Date.now() - joinTime; // Verbrachte Zeit im Sprachkanal
        const xpGain = Math.floor(timeSpent / 60000); // 1 XP pro Minute

        // XP zum Benutzer hinzufügen
        if (!levelingData[userId]) {
            levelingData[userId] = { xp: 0, level: 1 };
        }

        levelingData[userId].xp += xpGain;
        voiceTimes.delete(userId); // Benutzer aus der Map entfernen, da er den Kanal verlassen hat

        // Überprüfen auf Level-Up und Daten speichern
        checkLevelUp(userId, newState.guild);
        saveLevelingData();
    }
});

// Funktion zur Überprüfung und Benachrichtigung für Level-Up
function checkLevelUp(userId, guild) {
    const userData = levelingData[userId];
    const xpForNextLevel = 5 * Math.pow(userData.level, 2);

    if (userData.xp >= xpForNextLevel) {
        userData.level += 1;
        userData.xp = 0; // XP zurücksetzen

        // Benachrichtigung in einem bestimmten Kanal
        const levelUpChannel = guild.channels.cache.get('1284633527580885092'); // Ersetze durch deine Kanal-ID
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

// Schimpfwörter Liste
const badWords = ['badword1', 'badword2', 'badword3']; // Füge hier die Schimpfwörter hinzu

// Einzelner messageCreate-Event-Handler
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const args = message.content.trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // Schimpfwörter filtern
    const foundBadWord = badWords.some(word => message.content.toLowerCase().includes(word));
    if (foundBadWord) {
        await message.delete();
        await message.reply('Please avoid using inappropriate language. You have been warned.');
        await logWarning(message.author, 'Used inappropriate language.');
        return;
    }

    // --- Leveling-System --- 
    const userId = message.author.id;

    // Initialisiere Level-Daten für einen neuen Benutzer
    if (!levelingData[userId]) {
        levelingData[userId] = { xp: 0, level: 1 };
    }

    // Füge zufällige XP für Nachrichten hinzu
    const xpGain = Math.floor(Math.random() * 10) + 1;
    levelingData[userId].xp += xpGain;

    // Überprüfen auf Level-Up und Daten speichern
    checkLevelUp(userId, message.guild);
    saveLevelingData();

    // --- Befehlsverarbeitung --- 
    // Musikbefehle
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
            player.nodes.delete(message.guild.id);
            return message.channel.send('I could not join your voice channel!');
        }

        try {
            const track = await player.search(song, { requestedBy: message.author }).then(x => x.tracks[0]);
            if (!track) throw new Error('No results found.');

            queue.addTrack(track);
            if (!queue.node.isPlaying()) await queue.node.play();

            message.channel.send(`Now playing: **${track.title}**`);
            logActivity(`Playing track: ${track.title} requested by ${message.author.tag}`);
        } catch (error) {
            message.channel.send('An error occurred while trying to play the song.');
        }
    }

    if (command === '!stop') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue || !queue.node.isPlaying()) return message.reply('No music is currently playing.');
        queue.delete();
        message.reply('Music stopped.');
        logActivity(`Music stopped by: ${message.author.tag}`);
    }

    if (command === '!skip') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue || !queue.node.isPlaying()) return message.reply('No music is currently playing.');
        queue.node.skip();
        message.reply('Track skipped.');
        logActivity(`Track skipped by: ${message.author.tag}`);
    }

    // Moderationsbefehle
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;

    if (command === '!kick') {
        const member = message.mentions.members.first();
        if (!member) return message.reply('Please mention a user to kick.');
        if (!member.kickable) return message.reply('I cannot kick this user.');
        member.kick().then(() => {
            message.reply(`${member.user.tag} was kicked.`);
            logActivity(`User kicked: ${member.user.tag}`);
        }).catch(err => {
            message.reply('I couldn’t kick the user.');
        });
    }

    if (command === '!ban') {
        const member = message.mentions.members.first();
        if (!member) return message.reply('Please mention a user to ban.');
        if (!member.bannable) return message.reply('I cannot ban this user.');
        member.ban().then(() => {
            message.reply(`${member.user.tag} was banned.`);
            logActivity(`User banned: ${member.user.tag}`);
        }).catch(err => {
            message.reply('I couldn’t ban the user.');
        });
    }
});

// Funktion zum Loggen von Aktivitäten
function logActivity(activity) {
    const logChannel = client.channels.cache.get(logChannelId);
    if (logChannel) {
        const logEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('Activity Log')
            .setDescription(activity)
            .setTimestamp();

        logChannel.send({ embeds: [logEmbed] });
    }
}

// Funktion zum Protokollieren von Warnungen
async function logWarning(user, reason) {
    const warnMessage = `User: <@${user.id}> | Reason: ${reason}`;
    const warnChannel = client.channels.cache.get(warnChannelId);
    if (warnChannel) {
        const warnEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('User Warning')
            .setDescription(warnMessage)
            .setTimestamp();

        warnChannel.send({ embeds: [warnEmbed] });
    }

    // Speichern der Warnung in warnsData
    if (!warnsData[user.id]) {
        warnsData[user.id] = [];
    }
    warnsData[user.id].push({ reason, timestamp: new Date() });
    saveWarnsData();
}

// Bot anmelden
client.login(process.env.TOKEN);
