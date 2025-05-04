/* REST: Bruges til at sende HTTP-forespørgsler til Discords API.
Routes: Indeholder URL-ruter til forskellige endpoints i Discords API.
SlashCommandBuilder: Gør det nemt at opbygge slash commands. */
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();


/* Læser alle .mp3-filer fra audio-mappen */
const audioDir = path.join(__dirname, 'audio');
const audioFiles = fs.readdirSync(audioDir).filter(file => file.endsWith('.mp3'));

/* Opretter valg baseret på filnavne */
const soundChoices = audioFiles.map(file => ({
  name: path.parse(file).name.replace(/[-_]/g, ' '), // pænere visning
  value: file
}));


/* Denne fil registrerer slash commands globalt, 
   så de virker på alle Discord-servere hvor botten er tilføjet. */
const commands = [
    new SlashCommandBuilder()
    .setName('spooky')
    .setDescription('Fortæller en spooky historie eller spiller en uhyggelig lyd, hvis du er i voice!'),

    new SlashCommandBuilder()
    .setName('story')
    .setDescription('Få en tilfældig spooky-historie sendt i chatten!'),

    new SlashCommandBuilder()
    .setName('about')
    .setDescription('Få information om hvad Spooky-botten kan.'),

    /* Opretter slash command med dynamiske valg */
    new SlashCommandBuilder()
    .setName('choose-sound')
    .setDescription('Vælg en bestemt spooky-lyd og afspil den')
    .addStringOption (option =>
        option.setName('lyd')
        .setDescription('Vælg hvilken lyd der skal afspilles')
        .setRequired(true)
        .addChoices(...soundChoices)
    )

/* .toJSON() konverterer kommandoen til det format, Discords API kræver.
.map(...) bruges her for at konvertere hvert command-objekt til JSON-format */
].map(command => command.toJSON());

/* Opretter en REST-klient til Discord API med din bot-token */
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

/* Ryd guild commands med et tomt array */
/* rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: [] })
.then(() => console.log('🧹 Guild commands slettet.'))
.catch(console.error); */

/* Routes.applicationCommands(...) bruges til at registrere globale commands.
body: commands sender de definerede kommandoer til Discord. */
rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })
.then(() => console.log('✅ Slash command registreret.'))
.catch(console.error);


// Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
// Routes.applicationCommands(process.env.CLIENT_ID)