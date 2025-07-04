const path = require('path');
const fs = require('fs');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const { getSeasonOrHoliday } = require('./utils');
const { db } = require('./firebase'); // henvisning til Firebase-databasen

// Returnerer stien til den relevante audio-mappe ud fra sæson/højtid
function getSeasonAudioPath() {
    const season = getSeasonOrHoliday();
    return path.join(__dirname, 'audio', season);
}

// Returnerer en tilfældig lydfil fra den relevante mappe
function getRandomSoundPath() {
    // Finder den rigtige audio-mappe ud fra årstiden (fx /audio/jul/)
    const audioDir = getSeasonAudioPath();

    // Tjekker om mappen eksisterer, hvis ikke returneres null
    if (!fs.existsSync(audioDir)) return null;

    // Læser alle .mp3-filer fra den valgte audio-mappe
    const files = fs.readdirSync(audioDir).filter(file => file.endsWith('.mp3'));
    
    // Hvis der ikke er nogen filer, returneres null
    if (files.length === 0) return null;

    // Vælg tilfældig lydfil
    const randomFile = files[Math.floor(Math.random() * files.length)];
    return path.join(audioDir, randomFile);
}

// Returnerer brugerens voice kanal
function getVoiceChannel(interaction) {
    return interaction.member?.voice?.channel ?? null;
}

// Spiller lyd i en voice-kanal
function playSoundInVoice(voiceChannel, soundPath) {
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
    player.on('idle', () => connection.destroy());

    // Logger fejl hvis afspilning fejler
    player.on('error', error => {
        console.error('Fejl under afspilning:', error);
        connection.destroy();
    });
}

/*  Svarer midlertidigt og sletter det igen (så brugeren ikke ser noget).
    Så "Applikationen svarede ikke" undgåes. */
function deferAndDelete(interaction) {
    return interaction.deferReply({ flags: 1 << 6 })
    .then(() => interaction.deleteReply())
    .catch(console.error);
}

/* Henter og sender en passende historie baseret på sæson/højtid – fallback til 'standard' */
function sendRandomStory(target) {
    const season = getSeasonOrHoliday(); // Bestem sæson/højtid
    // Henter data fra Firebase-databasen.
    const dbRef = db.ref(season);

    // Henter data fra den relevante sti i databasen
    dbRef.once('value')
    // Når data er hentet, tjekker vi om der findes historier til den aktuelle sæson.
    .then((snapshot) => {
        // Hvis der findes historier til sæsonen
        if (snapshot.exists()) {
            // Henter det faktiske array af historier
            const stories = snapshot.val();
            const story = stories[Math.floor(Math.random() * stories.length)];
            target.reply(story);
        } else {
            // Hvis der ikke findes historier til sæsonen → prøv standard
            return db.ref('standard').once('value')
            .then((fallback) => {
                if (fallback.exists()) {
                    const fallbackStories = fallback.val();
                    const story = fallbackStories[Math.floor(Math.random() * fallbackStories.length)];
                    target.reply(story);
                } else {
                    target.reply('Der findes ingen historier endnu 😢');
                }
            });
        }
    }).catch((error) => {
        /* Hvis der opstår en fejl under hentning af data fra databasen, 
        sendes en fejlmeddelelse til kanalen. */
        console.error('Fejl ved hentning fra Firebase:', error);
        if (target.reply) target.reply('Der opstod en fejl ved hentning af historier.');
    });
}

// Håndterer slash commands, der skal afspille lyd
function handleAudioCommand(interaction, voiceChannel, soundPath = null) {
    if (!soundPath) {
        soundPath = getRandomSoundPath();
        if (!soundPath) {
            interaction.reply('Der blev ikke fundet nogen passende lydfiler!');
            return;
        }
    }

    // Midlertidigt skjult svar, så Discord ikke tror botten er død
    deferAndDelete(interaction);
    // Afspil lyden i brugerens voice-kanal
    playSoundInVoice(voiceChannel, soundPath);
}

// Map til at holde styr på sidste afspilningstidspunkt for hver voice-kanal
const channelCooldowns = new Map();

/*
Tjekker hvert minut, om der er nogen i en voice-kanal.
Hvis der er, er der 5% chance for at afspille en sæsonbaseret lyd.
Der må ikke være afspillet noget i samme kanal de sidste 30 minutter.
*/
function autoVoiceSounds(client) {
    setInterval(() => {
        /* Gennemgår alle guilds
        (kanalerne er cachet i client.guilds.cache) */
        client.guilds.cache.forEach(guild => {
            /* Gennemgår alle kanaler i guilden
            (kanalerne er cachet i guild.channels.cache) */
            guild.channels.cache.forEach(channel => {
                if (channel.type === 2 && channel.members.size > 0) { // Type 2 = voice
                    const channelId = channel.id;
                    const now = Date.now();

                    // Tjekker om kanalen allerede har været brugt inden for de sidste 30 minutter
                    const lastPlayed = channelCooldowns.get(channelId) || 0;

                    // Cooldown: 30 minutter (1800000 ms)
                    if (now - lastPlayed < 1800000) return;

                    // 5% chance for at afspille lyd
                    if (Math.random() < 0.05) {
                        const soundPath = getRandomSoundPath();
                        if (soundPath) {
                            console.log(`Afspiller tilfældig lyd i kanal: ${channel.name}`);
                            playSoundInVoice(channel, soundPath);
                            channelCooldowns.set(channelId, now);
                        }
                    }
                }
            });
        });
    }, 60000); // Hvert minut
}

module.exports = {
    getSeasonAudioPath,
    getRandomSoundPath,
    getVoiceChannel,
    playSoundInVoice,
    deferAndDelete,
    sendRandomStory,
    handleAudioCommand,
    autoVoiceSounds
};
