/* REST: Bruges til at sende HTTP-forespørgsler til Discords API.
Routes: Indeholder URL-ruter til forskellige endpoints i Discords API.
SlashCommandBuilder: Gør det nemt at opbygge slash commands. */
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/* Importerer funktion til at finde aktuel sæson/højtid */
const { getSeasonOrHoliday } = require('./utils');

/* Hent aktuel årstid eller højtid, fx 'jul', 'påske', 'sommer' */
const season = getSeasonOrHoliday();

/* Henter lydvalg for aktuel årstid */
const audioDir = path.join(__dirname, 'audio', season);

/* Hvis mappen findes, bygges soundChoices (ellers tom) */
let soundChoices = [];

/* Tjekker om lydmappen findes og indeholder mp3-filer
fs.readdirSync(...) læser indholdet af mappen synkront */
if (fs.existsSync(audioDir)) {
    const files = fs.readdirSync(audioDir)
    .filter(file => file.endsWith('.mp3'));

    if (files.length > 0) {
        soundChoices = files.map(file => ({
            name: path.parse(file).name.replace(/[-_]/g, ' '), // Visningsnavn
            value: file // Faktisk filnavn
        }));
    } else {
        console.log('❌ Ingen lydfiler fundet i den aktuelle mappe.');
    }
} else {
    console.warn(`❌ Mappen ${audioDir} findes ikke. Sørg for at den eksisterer.`);
}

/* Opretter en liste af alle slash kommandoer til Discord-botten. */
const commands = [
    new SlashCommandBuilder()
    .setName('event')
    .setDescription('Fortæller en historie eller spiller en lyd, hvis du er i voice!'),

    new SlashCommandBuilder()
    .setName('story')
    .setDescription('Få en tilfældig historie ud fra årstid sendt i chatten!'),

    new SlashCommandBuilder()
    .setName('about')
    .setDescription('Få information om hvad botten kan.')
];

    /* Tilføjer /choose-sound hvis der er tilgængelige lyde */
    if (soundChoices.length > 0) {
        commands.push(
            /* Opretter slash command med dynamiske valg */
            new SlashCommandBuilder()
            .setName('choose-sound')
            .setDescription('Vælg en bestemt lyd fra årstiden')
            .addStringOption(option =>
            option
                .setName('lyd')
                .setDescription('Vælg hvilken lyd der skal afspilles')
                .setRequired(true)
                .addChoices(...soundChoices)
            )
        );
    }

/* .toJSON() konverterer kommandoen til det format, Discords API kræver.
.map(...) bruges her for at konvertere hvert command-objekt til JSON-format */
const jsonCommands = commands.map(command => command.toJSON());

/* Opretter en REST-klient til Discord API med din bot-token */
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

/* Ryd guild commands med et tomt array */
/* rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: [] })
.then(() => console.log('Guild commands slettet.'))
.catch(console.error); */

/* Ryd global commands med et tomt array */
/* rest.put(
  Routes.applicationCommands(process.env.CLIENT_ID),
  { body: [] }
).then(() => console.log('Globale slash commands slettet.')); */

/* Routes.applicationCommands(...) bruges til at registrere globale commands.
body: commands sender de definerede kommandoer til Discord. */
rest.put(Routes.applicationCommands(process.env.CLIENT_ID),
{ body: jsonCommands })
.then(() => console.log('✅ Slash command registreret.'))
.catch(console.error);


// Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
// Routes.applicationCommands(process.env.CLIENT_ID)