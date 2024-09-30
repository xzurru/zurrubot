const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers,  // Intents für das GuildMemberAdd-Event
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// Bereits vorhandener Code
client.once('ready', () => {
    console.log(`Eingeloggt als ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
    if (message.content === '!help') {
        message.channel.send('Welcome this bot made by ! xzurru');
    }
});

// Neue Funktion: Wenn ein User dem Server joint, werden ihm zwei Rollen zugewiesen und eine Willkommensnachricht gesendet
client.on('guildMemberAdd', (member) => {
    // Die beiden Rollen-IDs (ersetze durch deine tatsächlichen Rollen-IDs)
    const role1 = member.guild.roles.cache.get('1284519960143462584');
    const role2 = member.guild.roles.cache.get('1287132493547569192');

    // Rollen zuweisen
    if (role1 && role2) {
        member.roles.add([role1, role2])
            .then(() => console.log(`Rollen erfolgreich an ${member.user.tag} vergeben`))
            .catch(console.error);
    } else {
        console.log('Eine der Rollen wurde nicht gefunden');
    }

    // Willkommensnachricht in einem bestimmten Kanal senden
    const welcomeChannel = member.guild.channels.cache.get('1284517411005005948');  // Setze hier die ID deines Willkommen-Kanals ein

    if (welcomeChannel) {
        // Erstelle eine Willkommensnachricht mit dem Profilbild des neuen Users
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Добро пожаловать на сервер!')
            .setDescription(`Привет, ${member.user.username}, добро пожаловать на сервер! Мы рады тебя видеть! 🎉`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 })) // Profilbild des neuen Users
            .setFooter({ text: 'Мы надеемся, что тебе здесь понравится!' });

        // Nachricht im Kanal senden
        welcomeChannel.send({ embeds: [welcomeEmbed] });
    }
});

client.login(process.env.TOKEN);
