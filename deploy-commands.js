/* REST: Bruges til at sende HTTP-forespørgsler til Discords API.
Routes: Indeholder URL-ruter til forskellige endpoints i Discords API.
SlashCommandBuilder: Gør det nemt at opbygge slash commands. */
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();


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
    .setDescription('Få information om hvad Spooky-botten kan.')
    
/* .toJSON() konverterer kommandoen til det format, Discords API kræver.
.map(...) bruges her for at konvertere hvert command-objekt til JSON-format */
].map(command => command.toJSON());

/* Opretter en REST-klient til Discord API med din bot-token */
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

/* Routes.applicationCommands(...) bruges til at registrere globale commands.
body: commands sender de definerede kommandoer til Discord. */
rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })
.then(() => console.log('✅ Slash command registreret.'))
.catch(console.error);