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
        GatewayIntentBits.MessageContent]
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
    
    if (message.content.toLowerCase() === '!spooky' && !message.author.bot) {
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
                message.channel.send(randomStory);
            } else {
                /* Hvis der ikke findes data i den ønskede del af databasen, 
                sendes en fejlmeddelelse til kanalen. */
                message.channel.send('Ingen historier fundet.');
            }
        })
        .catch((error) => {
            /* Hvis der opstår en fejl under hentning af data fra databasen, 
            sendes en fejlmeddelelse til kanalen. */
            console.error('Fejl ved hentning fra Firebase:', error);
            message.channel.send('Der opstod en fejl ved hentning af historier.');
        });
    } else if (message.content.toLowerCase() === '!sv') {
        const voiceChannel = message.member.voice.channel;
        /* Hvis brugeren skriver !sv, og botten ikke er i en voice-kanal, 
        sendes en besked tilbage til kanalen. */
        if (!voiceChannel) {
            message.reply('Du skal være i en voice-kanal for at høre spøgelseslydene! 👻');
            return;
        }

        // Join voice-kanalen
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        // Opret audio player
        const player = createAudioPlayer();
        const soundPath = path.join(__dirname, 'audio', 'dark-ambient.mp3');

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
});