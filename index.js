const {Client, GatewayIntentBits } = require('discord.js');

// Henter hjælpefunktioner (lyde, Firebase, svar mv.)
const {
    getVoiceChannel,
    getSeasonAudioPath,
    handleAudioCommand,
    sendRandomStory,
    autoVoiceSounds
} = require('./helpers');

/* dotenv er en pakke, der kan gemme miljøvariabler i en .env-fil, så man kan beskytte 
følsomme oplysninger som Discord bot token, API-nøgler eller databladresser. */
require('dotenv').config();

/* Denne kode opretter en ny Discord bot-klient og specificerer, 
hvilke events botten skal lytte efter ved hjælp af intents. */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Logger fejl der ellers ville crashe botten uden besked
process.on('unhandledRejection', (error) => {
    console.error('Uventet fejl:', error);
});

/* Denne kode logger botten ind på Discord ved at bruge en token, 
der er gemt i miljøvariablen DISCORD_TOKEN. */
client.login(process.env.DISCORD_TOKEN);

/* Venter på, at ready-eventen udløses, hvilket betyder, at botten er 
færdig med at logge ind og er klar til brug. Køres én gang. */
client.once('ready', () => {
    console.log('Bot er online!');
});

/*  Event der lytter efter beskeder. Hvis er bliver skrevet i en kanal
er der en chance for at botten sender en tilfældig historie. */
client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    // 10 % chance for at sende en historie, når nogen skriver noget
    if (Math.random() < 0.1) {
        sendRandomStory(message);
    }
});


/* Denne event lytter efter slash commands, 
   og kører hver gang en bruger interagerer med en kommando. */
client.on('interactionCreate', (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // /event – spiller lyd hvis i voice, ellers sender historie
    if (commandName === 'event') {
        // Henter den voice-kanal brugeren er i
        const voiceChannel = getVoiceChannel(interaction);

        // Brugeren er IKKE i en voice-kanal → send teksthistorie
        if (!voiceChannel) {
            sendRandomStory(interaction);
            return;
        }

        // Brugeren er i en voice-kanal → afspil tilfældig sæson lyd
        handleAudioCommand(interaction, voiceChannel);
    }

    // /story – sender altid en historie, uanset om man er i voice eller ej
    else if (commandName === 'story') {
        sendRandomStory(interaction);
    }

    // ℹ/about – sender info om hvad botten kan
    else if (commandName === 'about') {
        interaction.reply({
            content: `🕰️ Jeg er en stemningsbot, der bringer årstiden til live med lyd og fortællinger.

📜 Brug /story for at få en fortælling, der passer til årstiden eller højtiden – fx vinter, forår, jul eller påske.

🔊 Brug /event for at høre en sæsonbaseret lyd, hvis du er i en voice-kanal – ellers får du en fortælling i chatten.

🎧 Brug /choose-sound for selv at vælge en lyd fra den aktuelle årstid.

🍂 Uanset om det er sensommer, juletid eller forårssol, er jeg klar med indhold, der matcher stemningen.`,
            flags: 1 << 6
        });
    }

    // /choose-sound – afspiller en bestemt lyd valgt af brugeren
    else if (interaction.commandName === 'choose-sound') {
        const voiceChannel = getVoiceChannel(interaction);

        // Hvis brugeren ikke er i en voice-kanal
        if (!voiceChannel) {
            interaction.reply('Du skal være i en voice-kanal for at bruge denne kommando!');
            return;
        }

        const chosenFile = interaction.options.getString('lyd');

        // Mappen for den aktuelle årstid/højtid
        const seasonalDir = getSeasonAudioPath();
        const soundPath = path.join(seasonalDir, chosenFile);

        // Tjekker om lydfilen eksisterer
        if (!!require('fs').existsSync(soundPath)) {
            interaction.reply('Den valgte lyd kunne ikke findes!');
            return;
        }

        handleAudioCommand(interaction, voiceChannel, soundPath);
    }
});

autoVoiceSounds(client);