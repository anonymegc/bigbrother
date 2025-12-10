require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const config = require('./config.json');

// -----------------------------
// EXPRESS KEEP-ALIVE
// -----------------------------
const PORT = process.env.PORT || 10000;
const app = express();
app.get('/', (req, res) => res.send('✅ Big Brother bot running!'));
app.listen(PORT, () => console.log(`🌐 HTTP server alive on port ${PORT}`));

// -----------------------------
// LUODAAN CLIENT
// -----------------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences
    ],
    partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.Message,
        Partials.User,
        Partials.Reaction,
        Partials.ThreadMember
    ]
});

// -----------------------------
// COLLECTIONS
// -----------------------------
client.events = new Collection();
client.commands = new Collection();

// -----------------------------
// ERROR HANDLING
// -----------------------------
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection |", reason, promise);
});
process.on('uncaughtException', (error) => {
    console.error('Unhandled Exception:', error);
});

// -----------------------------
// WATCHLIST & TICKET
// -----------------------------
const watchlist = require('./Functions/watchlist'); // ← EI SULKUJA
const ticket = require('./Functions/ticket');

// -----------------------------
// EVENTIT
// -----------------------------
const { loadEvents } = require('./Handlers/eventHandler');
loadEvents(client);

// -----------------------------
// BOT READY
// -----------------------------
client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const guild = await client.guilds.fetch(config.guildID);
    await guild.members.fetch();

    watchlist.setGuildCache(guild);
    console.log("Guild jäsenten cache haettu.");

    await watchlist.scanWatchlist(client);
    console.log("Watchlist skannattu.");

    guild.members.cache.forEach(member =>
        watchlist.checkMemberAgainstWatchlist(client, member)
    );

    console.log("Watchlist tarkistus valmis.");
});

// -----------------------------
// EVENTIT
// -----------------------------
client.on("guildMemberAdd", async (member) => {
    await watchlist.checkMemberAgainstWatchlist(client, member);
});

client.on("messageCreate", async (message) => {
    await watchlist.handleNewWatchlistMessage(client, message);
    await ticket.handleInteraction(message);
});

client.on('interactionCreate', async (interaction) => {
    await ticket.handleInteraction(interaction);
});

// -----------------------------
// LOGIN
// -----------------------------
client.login(process.env.TOKEN);