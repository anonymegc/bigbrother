require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const config = require('./config.json'); // suhteellinen polku index.js:stä

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
// LADATAAN WATCHLIST & TICKET
// -----------------------------
const watchlist = require('./functions/watchlist')(client);
const ticket = require('./functions/ticket');

// -----------------------------
// LADATAAN EVENTIT
// -----------------------------
const { loadEvents } = require('./handlers/eventHandler');
loadEvents(client);

// -----------------------------
// BOT READY
// -----------------------------
client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Hae guild ja jäsenten cache ensin
    const guild = await client.guilds.fetch(config.guildID);
    await guild.members.fetch();
    watchlist.setGuildCache(guild);
    console.log("Guild jäsenten cache haettu");

    // Päivitä watchlist kanavasta
    if (watchlist && typeof watchlist.scanWatchlist === "function") {
        await watchlist.scanWatchlist();
        console.log("Watchlist kanava skannattu ja jäsenet tarkistettu");
    }

    // Käydään läpi kaikki jäsenet
    guild.members.cache.forEach(member => watchlist.checkMemberAgainstWatchlist(member));
    console.log("Watchlist tarkistus olemassa oleville jäsenille valmis");
});

// -----------------------------
// BOT EVENTIT
// -----------------------------
client.on("guildMemberAdd", async (member) => {
    console.log(`Uusi jäsen liittyi: ${member.user.tag}`);
    await watchlist.checkMemberAgainstWatchlist(member);
});

client.on("messageCreate", async (message) => {
    // --- Watchlist-kanava ---
    await watchlist.handleNewWatchlistMessage(message);

    // --- Ticket-kanava & interaktiot ---
    await ticket.handleInteraction(message);
});

// --- Kaikki interactionCreate-eventit Ticket.js:lle ---
client.on('interactionCreate', async (interaction) => {
    await ticket.handleInteraction(interaction);
});

// -----------------------------
// BOT LOGIN
// -----------------------------
client.login(process.env.TOKEN);
