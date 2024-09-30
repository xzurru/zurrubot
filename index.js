const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { Player } = require('discord-player');
const fs = require('fs');
require('dotenv').config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers,  
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates // Für Sprachkanalaktivitäten und Musik
    ] 
});

const player = new Player(client, {
    ytdlOptions: {
        filter: "audioonly"
    }
});

// Lade Leveling-Daten
let levelingData = require('./leveling.json');

// Funktion zum Speichern der Level-Daten
function saveLevelingData() {
    fs.writeFile('./leveling.json', JSON.stringify(levelingData, null, 2), (err) => {
        if (err) console.log(err);
    });
}

// Bot ready event
client.once('ready', () => {
    console.log(`Eingeloggt als ${client.user.tag}`);
});

// Willkommensnachricht und Rollenvergabe
client.on('guildMemberAdd', (member) => {
    const role1 = member.guild.roles.cache.get('1284519960143462584');
    const role2 = member.guild.roles.cache.get('1287132493547569192');

    if (role1 && role2) {
        member.roles.add([role1, role2])
            .then(() => console.log(`Rollen erfolgreich an ${member.user.tag} vergeben`))
            .catch(console.error);
    }

    const welcomeChannel = member.guild.channels.cache.get('1284517411005005948');
    if (welcomeChannel) {
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Добро пожаловать на сервер!')
            .setDescription(`Привет, ${member.user.username}, добро пожаловать на сервер! Мы рады тебя видеть! 🎉`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setFooter({ text: 'Мы надеемся, что тебе здесь понравится!' });

        welcomeChannel.send({ embeds: [welcomeEmbed] });
    }
});

// Sprachkanal-Tracking: Zeitpunkt des Betretens und Verlassens
const voiceTimes = new Map();

client.on('voiceStateUpdate', (oldState, newState) => {
    const userId = newState.id;

    // Wenn ein User einem Sprachkanal beitritt
    if (!oldState.channelId && newState.channelId) {
        voiceTimes.set(userId, Date.now()); // Speichere den Zeitpunkt des Beitritts
    }

    // Wenn ein User den Sprachkanal verlässt
    if (oldState.channelId && !newState.channelId) {
        const joinTime = voiceTimes.get(userId);
        if (!joinTime) return;

        const timeSpent = Date.now() - joinTime; // Zeit im Sprachkanal
        const xpGain = Math.floor(timeSpent / 60000); // 1 XP pro Minute

        // Füge dem User XP hinzu
        if (!levelingData[userId]) {
            levelingData[userId] = { xp: 0, level: 1 };
        }

        levelingData[userId].xp += xpGain;
        voiceTimes.delete(userId); // Entferne den User aus der Map, da er den Kanal verlassen hat

        // Level-Up prüfen und speichern
        checkLevelUp(userId, newState.guild);
        saveLevelingData();
    }
});

// Nachrichtenbasierte XP-Vergabe
client.on('messageCreate', (message) => {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;

    // Initialisiere Leveling-Daten für neuen User
    if (!levelingData[userId]) {
        levelingData[userId] = { xp: 0, level: 1 };
    }

    // Füge zufällig XP für Nachrichten hinzu
    const xpGain = Math.floor(Math.random() * 10) + 1;
    levelingData[userId].xp += xpGain;

    // Level-Up prüfen und speichern
    checkLevelUp(userId, message.guild);
    saveLevelingData();
});

// Funktion zur Überprüfung und Benachrichtigung bei Level-Up
function checkLevelUp(userId, guild) {
    const userData = levelingData[userId];
    const xpForNextLevel = 5 * Math.pow(userData.level, 2);

    if (userData.xp >= xpForNextLevel) {
        userData.level += 1;
        userData.xp = 0;  // XP zurücksetzen oder Rest-XP übernehmen

        // Benachrichtigung in einem bestimmten Kanal
        const levelUpChannel = guild.channels.cache.get('1284633527580885092'); // Setze hier deine Kanal-ID ein
        if (levelUpChannel) {
            const levelUpEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`🎉 Level-Up!`)
                .setDescription(`<@${userId}> ist jetzt Level ${userData.level}!`)
                .setThumbnail(guild.members.cache.get(userId).user.displayAvatarURL({ dynamic: true }));

            levelUpChannel.send({ embeds: [levelUpEmbed] });
        }
    }
}

// Musikbot-Befehle
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const args = message.content.split(' ');

    // Musik abspielen
    if (args[0] === '!play') {
        const query = args.slice(1).join(' ');
        const channel = message.member.voice.channel;
        if (!channel) return message.reply('Du musst in einem Sprachkanal sein!');
        
        const result = await player.search(query, {
            requestedBy: message.author,
            searchEngine: 'youtube'
        });
        if (!result || !result.tracks.length) return message.reply('Kein Ergebnis gefunden!');

        const queue = await player.createQueue(message.guild, {
            metadata: {
                channel: message.channel
            }
        });

        try {
            if (!queue.connection) await queue.connect(channel);
        } catch {
            queue.destroy();
            return message.reply('Ich konnte dem Sprachkanal nicht beitreten.');
        }

        message.reply(`🎶 Lade jetzt **${result.tracks[0].title}**`);
        queue.addTrack(result.tracks[0]);
        if (!queue.playing) await queue.play();
    }

    // Musik stoppen
    if (args[0] === '!stop') {
        const queue = player.getQueue(message.guild.id);
        if (!queue) return message.reply('Es läuft keine Musik.');
        queue.destroy();
        message.reply('Musik gestoppt.');
    }

    // Musik überspringen
    if (args[0] === '!skip') {
        const queue = player.getQueue(message.guild.id);
        if (!queue || !queue.playing) return message.reply('Es läuft keine Musik.');
        queue.skip();
        message.reply('Musik übersprungen.');
    }
});

client.on('messageCreate', (message) => {
    if (!message.guild || !message.member) return; // Stelle sicher, dass die Nachricht von einem Server und nicht einer DM stammt
    if (!message.member.permissions.has('BAN_MEMBERS')) return;

    const args = message.content.split(' ');

    // Kick
    if (args[0] === '!kick') {
        const member = message.mentions.members.first();
        if (!member) return message.reply('Bitte erwähne ein Mitglied.');
        member.kick().then(() => {
            message.reply(`${member.user.tag} wurde gekickt.`);
        }).catch(err => {
            message.reply('Ich konnte den Benutzer nicht kicken.');
            console.error(err);
        });
    }

    // Ban
    if (args[0] === '!ban') {
        const member = message.mentions.members.first();
        if (!member) return message.reply('Bitte erwähne ein Mitglied.');
        member.ban().then(() => {
            message.reply(`${member.user.tag} wurde gebannt.`);
        }).catch(err => {
            message.reply('Ich konnte den Benutzer nicht bannen.');
            console.error(err);
        });
    }

    // Nachrichten löschen
    if (args[0] === '!clear') {
        const amount = parseInt(args[1]);
        if (isNaN(amount)) return message.reply('Bitte gib eine Zahl an.');
        message.channel.bulkDelete(amount, true).catch(err => {
            message.reply('Es gab einen Fehler beim Löschen der Nachrichten.');
            console.error(err);
        });
    }
});

client.login(process.env.TOKEN);
