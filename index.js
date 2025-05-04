const {Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const { db, ref, get, child } = require('./firebase');
const fs = require('fs');
const path = require('path');

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
    console.log('spooky er online!');
});

/* Funktion der henter og sender en tilfældig historie fra databasen */
function sendRandomStory(interaction) {
    /* Henter data fra Firebase-databasen. 
    child() bruges til at navigere til en bestemt del af databasen. */
    const dbRef = ref(db);
    get(child(dbRef, 'stories'))
        .then((snapshot) => {
            if (snapshot.exists()) {
                const stories = snapshot.val();
                const randomStory = stories[Math.floor(Math.random() * stories.length)];
                interaction.reply(randomStory);
            } else {
                interaction.reply('Ingen historier fundet.');
            }
        })
        .catch((error) => {
            /* Hvis der opstår en fejl under hentning af data fra databasen, 
                sendes en fejlmeddelelse til kanalen. */
            console.error('Fejl ved hentning fra Firebase:', error);
            interaction.reply('Der opstod en fejl ved hentning af historier.');
        });
}

/* Denne event lytter efter slash commands, 
   og kører hver gang en bruger interagerer med en kommando. */
client.on('interactionCreate', (interaction) => {
    if (!interaction.isChatInputCommand()) return;


    // 🎃 /spooky – spiller lyd hvis i voice, ellers sender historie
    if (interaction.commandName === 'spooky') {
        const member = interaction.member;
        const voiceChannel = member.voice?.channel;

        // Brugeren er IKKE i en voice-kanal → send teksthistorie
        if (!voiceChannel) {
            sendRandomStory(interaction);
            return;
        }

        // Brugeren er i en voice-kanal → afspil lyd

        // Find alle mp3-filer i audio-mappen
        const audioDir = path.join(__dirname, 'audio');
        const soundFiles = fs.readdirSync(audioDir).filter(file => file.endsWith('.mp3'));

        // Hvis der ikke findes nogen lydfiler → send fejlbesked
        if (soundFiles.length === 0) {
            interaction.reply('Der blev ikke fundet nogen lydfiler!');
            return;
        }

        // Vælg tilfældig lydfil
        const randomSound = soundFiles[Math.floor(Math.random() * soundFiles.length)];
        const soundPath = path.join(audioDir, randomSound);

        /*  Svarer midlertidigt og sletter det igen (så brugeren ikke ser noget).
        Så "Applikationen svarede ikke" undgåes. */
        interaction.deferReply({ flags: 1 << 6 }) // 1 << 6 svarer til "Ephemeral"
        .then(() => {
            // Sletter svaret igen så brugeren intet ser
            interaction.deleteReply();
        })
        .catch(console.error);

        // Join voice-kanalen
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        // Opret audio player og resource samt afspiller lyden
        const player = createAudioPlayer();
        const resource = createAudioResource(soundPath);
        player.play(resource);
        connection.subscribe(player);

        // Når lyden er færdig, forlad voice-kanalen
        player.on('idle', () => {
            connection.destroy();
        });
        
        // Logger fejl hvis afspilning fejler
        player.on('error', error => {
            console.error('Fejl under afspilning:', error);
            interaction.reply('Der opstod en fejl under afspilning af lyden.');
            connection.destroy();
        });
    }

    // 📜 /story – sender altid en historie, uanset om man er i voice eller ej
    if (interaction.commandName === 'story') {
        sendRandomStory(interaction);
    }

    // ℹ️ /about – sender info om hvad botten kan
    if (interaction.commandName === 'about') {
        interaction.reply({
            content: `👻 Jeg er SpookyBot – din uhyggelige assistent til mørke aftener og Halloween-stemning!
            
🔊 Brug /spooky for at få en uhyggelig historie... eller høre en creepy lyd, hvis du er i en voice-kanal.

📜 Brug /story for at få en tilfældig gyserhistorie direkte i chatten.

🎧 Brug /choose-sound for selv at vælge, hvilken lyd der skal give dig kuldegysninger.

🔮 Jeg er her for at skræmme dig på den hyggelige måde!`,
            flags: 1 << 6
        });
    }

    // 🔊 /choose-sound – afspiller en bestemt lyd valgt af brugeren
    if (interaction.commandName === 'choose-sound') {
        const member = interaction.member;
        const voiceChannel = member.voice?.channel;

        // Hvis brugeren ikke er i en voice-kanal
        if (!voiceChannel) {
            interaction.reply('Du skal være i en voice-kanal for at bruge denne kommando!');
            return;
        }

        const chosenFile = interaction.options.getString('lyd');
        const soundPath = path.join(__dirname, 'audio', chosenFile);

        // Tjekker om lydfilen eksisterer
        if (!fs.existsSync(soundPath)) {
            interaction.reply('Den valgte lyd kunne ikke findes!');
            return;
        }

        // Midlertidigt svar der slettes igen
        interaction.deferReply({ flags: 1 << 6 })
            .then(() => interaction.deleteReply())
            .catch(console.error);

        // Joiner voice-kanalen og afspiller lyden
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        const resource = createAudioResource(soundPath);
        player.play(resource);
        connection.subscribe(player);

        player.on('idle', () => {
            connection.destroy();
        });

        player.on('error', error => {
            console.error('Fejl under afspilning:', error);
            connection.destroy();
        });
    }
});