require('dotenv').config();
const express = require('express');
const path = require('path');
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
// TICKET
// -----------------------------
const ticket = require('./Functions/ticket');

// -----------------------------
// EVENT HANDLER
// -----------------------------
const { loadEvents } = require('./Handlers/eventHandler');
loadEvents(client);

// -----------------------------
// BOT READY
// -----------------------------
client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    try {
        // --- Hae guild ja jäsenet ---
        const guild = await client.guilds.fetch(config.guildID);
        await guild.members.fetch();

        // --- Lähetä ticket-panel ---
        const channel = await guild.channels.fetch(config.channels.ticketsChannel);
        await ticket.sendTicketPanel(channel);
        console.log("🎫 Ticket-panel lähetetty kanavalle.");

        // --- Käynnistä watchlist vasta ticketin jälkeen ---
        try {
            const watchlistModule = require('./Functions/watchlist')(client);
            await watchlistModule.startWatching(); // <-- tärkeä
            console.log("👁️ Watchlist moduuli käynnistetty");
        } catch (err) {
            console.error("❌ Watchlist-moduulin käynnistys epäonnistui:", err);
        }

    } catch (err) {
        console.error("Virhe ready-eventissä:", err);
    }
});

// -----------------------------
// BOT EVENTS
// -----------------------------
client.on("messageCreate", async (message) => {
    try {
        await ticket.handleInteraction(message);
    } catch (err) {
        console.error("Error handleInteraction (messageCreate):", err);
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        await ticket.handleInteraction(interaction);
    } catch (err) {
        console.error("Error handleInteraction (interactionCreate):", err);
    }
});

// -----------------------------
// LOGIN
// -----------------------------
client.login(process.env.TOKEN);