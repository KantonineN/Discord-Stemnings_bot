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

/* Lytter efter nye beskeder i kanaler, hvor botten har adgang.
messageCreate-eventen kører, hver gang nogen skriver noget i chatten. */
client.on('messageCreate', (message) => {
    if (message.content.toLowerCase() === '!s' && !message.author.bot) {
        const voiceChannel = message.member.voice.channel;

        // Brugeren er IKKE i en voice-kanal → send teksthistorie
        if (!voiceChannel) {
            /* Henter data fra Firebase-databasen. 
            child() bruges til at navigere til en bestemt del af databasen. */
            const dbRef = ref(db);
            get(child (dbRef, 'stories'))
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const stories = snapshot.val();
                    /* Genererer et tilfældigt index i spookyStories-arrayet.
                    Metoden Math.floor() afrunder et tal nedad til det nærmeste heltal. */
                    const randomStory = stories[Math.floor(Math.random() * stories.length)];
                    /* Sender den valgte historie tilbage til den kanal, hvor brug
                    brugeren skrev !spooky. */
                    message.reply(randomStory);
                } else {
                    /* Hvis der ikke findes data i den ønskede del af databasen, 
                    sendes en fejlmeddelelse til kanalen. */
                    message.reply('Ingen historier fundet.');
                }
            })
            .catch((error) => {
                /* Hvis der opstår en fejl under hentning af data fra databasen, 
                sendes en fejlmeddelelse til kanalen. */
                console.error('Fejl ved hentning fra Firebase:', error);
                message.reply('Der opstod en fejl ved hentning af historier.');
            });
        } else {
            // Brugeren er i en voice-kanal → afspil lyd
            // Join voice-kanalen
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });

            // Opret audio player
            const player = createAudioPlayer();
            // Find alle mp3-filer i audio-mappen
            const audioDir = path.join(__dirname, 'audio');

            // Vælg tilfældig lydfil
            const soundFiles = fs.readdirSync(audioDir).filter(file => file.endsWith('.mp3'));
            if (soundFiles.length === 0) {
                message.reply('Der blev ikke fundet nogen lydfiler!');
                return;
            }
            const randomSound = soundFiles[Math.floor(Math.random() * soundFiles.length)];
            const soundPath = path.join(audioDir, randomSound);

            if (!fs.existsSync(soundPath)) {
                message.reply('Lyden kunne ikke findes!');
                return;
            }

            const resource = createAudioResource(soundPath);
            player.play(resource);
            connection.subscribe(player);

            player.on('idle', () => {
                connection.destroy();
            });
        
            player.on('error', error => {
                console.error('Fejl under afspilning:', error);
                message.channel.send('Der opstod en fejl under afspilning af lyden.');
                connection.destroy();
            });
        }
    }
});