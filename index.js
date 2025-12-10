require('dotenv').config();
const express = require('express');
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    Collection, 
    EmbedBuilder 
} = require('discord.js');

// CONFIG
const config = require('./config.json');
const GUILD_ID = config.guildID;

// EXPRESS KEEP-ALIVE
const PORT = process.env.PORT || 10000;
const app = express();

app.get('/', (req, res) => res.send('✅ Big Brother bot running!'));
app.listen(PORT, () => console.log(`🌐 HTTP server alive on port ${PORT}`));

// LUODAAN CLIENT
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

// EXPORT (jos joku tarvitsee clientin)
module.exports = client;

// COLLECTIONS
client.events = new Collection();
client.commands = new Collection();

// -----------------------------
// ERROR HANDLING
// -----------------------------
process.on("unhandledRejection", (reason, promise) => {
    console.error("Error | ", promise, "Syy | ", reason);
});
process.on('uncaughtException', (error) => {
    console.error('Unhandled Exception:', error);
});

// LADATAAN WATCHLIST (client annetaan parametrina)
const watchlist = require("./functions/watchlist")(client);

// LADATAAN EVENTIT
const { loadEvents } = require("./handlers/eventHandler");
loadEvents(client);


client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    if (watchlist && typeof watchlist.scanWatchlist === "function") {
        await watchlist.scanWatchlist();
    }

    // Haetaan guild ja jäsenet cacheen
    const guildCache = await client.guilds.fetch(GUILD_ID);
    await guildCache.members.fetch();
});

// BOT LOGIN
client.login(process.env.TOKEN);
