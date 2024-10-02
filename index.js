const { Client, GatewayIntentBits, EmbedBuilder, Events } = require('discord.js');
const { Player } = require('discord-player');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// Player initialisieren
const player = new Player(client);

// Leveling-Daten laden
let levelingData;
try {
    levelingData = JSON.parse(fs.readFileSync('./leveling.json'));
} catch (error) {
    console.error('Error loading leveling.json, initializing with an empty object.');
    levelingData = {};
    saveLevelingData();
}

// Warnungen laden
let warnsData;
try {
    warnsData = JSON.parse(fs.readFileSync('./warns.json'));
} catch (error) {
    console.error('Error loading warns.json, initializing with an empty object.');
    warnsData = {};
    saveWarnsData();
}

// Funktionen zum Speichern der Daten
function saveLevelingData() {
    fs.writeFileSync('./leveling.json', JSON.stringify(levelingData, null, 2));
}

function saveWarnsData() {
    fs.writeFileSync('./warns.json', JSON.stringify(warnsData, null, 2));
}

// Bot bereit-Event
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Befehle registrieren und sicherstellen, dass keine Duplikate existieren
client.on(Events.ClientReady, async () => {
    const guildId = '1279773903949926470'; // Ersetze mit deiner Guild-ID
    const guild = client.guilds.cache.get(guildId);

    if (guild) {
        // Alle bestehenden Befehle abrufen und löschen
        const existingCommands = await guild.commands.fetch();
        await Promise.all(existingCommands.map(cmd => cmd.delete()));

        // Neue Befehle registrieren
        const commandData = await guild.commands.set(commands);
        console.log(`Registered ${commandData.size} commands.`);
    } else {
        console.log('Guild not found!');
    }
});

// Slash-Befehle verwalten
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'play') {
        const song = interaction.options.getString('song');
        await handlePlayCommand(interaction, song);
    } else if (commandName === 'stop') {
        await handleStopCommand(interaction);
    } else if (commandName === 'kick') {
        const member = interaction.options.getMember('user');
        await handleKickCommand(interaction, member);
    } else if (commandName === 'ban') {
        const member = interaction.options.getMember('user');
        await handleBanCommand(interaction, member);
    } else if (commandName === 'warn') {
        const member = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        await handleWarnCommand(interaction, member, reason);
    } else if (commandName === 'timeout') {
        const member = interaction.options.getMember('user');
        const duration = interaction.options.getInteger('duration');
        await handleTimeoutCommand(interaction, member, duration);
    } else if (commandName === 'help') {
        await handleHelpCommand(interaction);
    } else if (commandName === 'clear') {
        const amount = interaction.options.getInteger('amount');
        await handleClearCommand(interaction, amount);
    }
});

// Befehlsdefinitionen
const commands = [
    {
        name: 'play',
        description: 'Play a song',
        options: [
            {
                name: 'song',
                type: 3, // STRING
                description: 'The name or URL of the song to play',
                required: true,
            },
        ],
    },
    {
        name: 'stop',
        description: 'Stop the currently playing music',
    },
    {
        name: 'kick',
        description: 'Kick a user from the server',
        options: [
            {
                name: 'user',
                type: 6, // USER
                description: 'The user to kick',
                required: true,
            },
        ],
    },
    {
        name: 'ban',
        description: 'Ban a user from the server',
        options: [
            {
                name: 'user',
                type: 6, // USER
                description: 'The user to ban',
                required: true,
            },
        ],
    },
    {
        name: 'warn',
        description: 'Warn a user',
        options: [
            {
                name: 'user',
                type: 6, // USER
                description: 'The user to warn',
                required: true,
            },
            {
                name: 'reason',
                type: 3, // STRING
                description: 'The reason for the warning',
                required: false,
            },
        ],
    },
    {
        name: 'timeout',
        description: 'Timeout a user',
        options: [
            {
                name: 'user',
                type: 6, // USER
                description: 'The user to timeout',
                required: true,
            },
            {
                name: 'duration',
                type: 4, // INTEGER
                description: 'Duration of the timeout in seconds',
                required: true,
            },
        ],
    },
    {
        name: 'help',
        description: 'Display the help information',
    },
    {
        name: 'clear',
        description: 'Clear a specified number of messages',
        options: [
            {
                name: 'amount',
                type: 4, // INTEGER
                description: 'The number of messages to clear',
                required: true,
            },
        ],
    },
];

// Willkommen Nachricht und Rollen zuweisen
client.on('guildMemberAdd', (member) => {
    const role1 = member.guild.roles.cache.get('1284519960143462584'); // Ersetze mit deiner Roll-ID
    const role2 = member.guild.roles.cache.get('1287132493547569192'); // Ersetze mit deiner Roll-ID

    if (role1 && role2) {
        member.roles.add([role1, role2]).catch(console.error);
    }

    const welcomeChannel = member.guild.channels.cache.get('1284517411005005948'); // Ersetze mit deiner Kanal-ID
    if (welcomeChannel) {
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Welcome to the server!')
            .setDescription(`Hello, ${member.user.username}, welcome to the server! We are glad to have you! 🎉`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setFooter({ text: 'We hope you enjoy your time here!' });

        welcomeChannel.send({ embeds: [welcomeEmbed] });
    }

    logActivity(`User joined: ${member.user.tag}`);
});

// Voice-Kanal Tracking
const voiceTimes = new Map();

client.on('voiceStateUpdate', (oldState, newState) => {
    const userId = newState.id;

    if (!oldState.channelId && newState.channelId) {
        voiceTimes.set(userId, Date.now());
        logActivity(`User joined voice channel: <@${userId}>`);
    }

    if (oldState.channelId && !newState.channelId) {
        const joinTime = voiceTimes.get(userId);
        if (!joinTime) return;

        const timeSpent = Date.now() - joinTime;
        const xpGain = Math.floor(timeSpent / 60000);

        if (!levelingData[userId]) {
            levelingData[userId] = { xp: 0, level: 1 };
        }

        levelingData[userId].xp += xpGain;
        voiceTimes.delete(userId);

        checkLevelUp(userId, newState.guild);
        saveLevelingData();
    }
});

// Level-Up Überprüfung
function checkLevelUp(userId, guild) {
    const userData = levelingData[userId];
    const xpForNextLevel = 5 * Math.pow(userData.level, 2);

    if (userData.xp >= xpForNextLevel) {
        userData.level += 1;
        userData.xp = 0;

        const levelUpChannel = guild.channels.cache.get('1284633527580885092'); // Ersetze mit deiner Kanal-ID
        if (levelUpChannel) {
            const levelUpEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🎉 Level Up!')
                .setDescription(`<@${userId}> has reached level ${userData.level}!`)
                .setThumbnail(guild.members.cache.get(userId).user.displayAvatarURL({ dynamic: true }));

            levelUpChannel.send({ embeds: [levelUpEmbed] });
        }
    }
}

// Liste der schlechten Wörter
const badWords = ['nigger', 'hurensohn', 'wichser'];

// Nachrichtenfilter
client.on('messageCreate', (message) => {
    if (badWords.some(word => message.content.toLowerCase().includes(word))) {
        message.delete();
        message.channel.send(`Message deleted! You cannot use bad words here.`);
        logActivity(`Deleted a message from ${message.author.tag}: "${message.content}"`);
    }
});

// Befehls-Handler-Funktionen
async function handlePlayCommand(interaction, song) {
    // Logik für den play-Befehl hier
    await interaction.reply(`Playing ${song}`);
}

async function handleStopCommand(interaction) {
    // Logik für den stop-Befehl hier
    await interaction.reply('Stopped playing music.');
}

async function handleKickCommand(interaction, member) {
    // Logik für den kick-Befehl hier
    await interaction.reply(`Kicked ${member.user.tag}`);
}

async function handleBanCommand(interaction, member) {
    // Logik für den ban-Befehl hier
    await interaction.reply(`Banned ${member.user.tag}`);
}

async function handleWarnCommand(interaction, member, reason) {
    if (!warnsData[member.id]) {
        warnsData[member.id] = [];
    }
    warnsData[member.id].push(reason);
    saveWarnsData();
    await interaction.reply(`Warned ${member.user.tag} for: ${reason}`);
}

async function handleTimeoutCommand(interaction, member, duration) {
    // Logik für den timeout-Befehl hier
    await interaction.reply(`Timed out ${member.user.tag} for ${duration} seconds.`);
}

async function handleHelpCommand(interaction) {
    const helpEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Help Menu')
        .setDescription('List of available commands:');
    commands.forEach(cmd => {
        helpEmbed.addFields({ name: cmd.name, value: cmd.description });
    });
    await interaction.reply({ embeds: [helpEmbed] });
}

async function handleClearCommand(interaction, amount) {
    if (amount < 1 || amount > 100) {
        return await interaction.reply('Please provide a number between 1 and 100.');
    }

    const deletedMessages = await interaction.channel.bulkDelete(amount, true);
    await interaction.reply(`Deleted ${deletedMessages.size} messages.`);
}

// Log Aktivität
function logActivity(message) {
    console.log(message);
}

// Bot einloggen
client.login(process.env.TOKEN);
