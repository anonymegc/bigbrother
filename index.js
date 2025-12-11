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
process.on("unhandledRejection", (reason, promise) => console.error("Unhandled Rejection |", reason, promise));
process.on('uncaughtException', (error) => console.error('Unhandled Exception:', error));

// -----------------------------
// FUNCTIONS
// -----------------------------
const ticket = require('./Functions/ticket');
const allowlist = require('./Functions/allowlist');

// -----------------------------
// EVENT HANDLER
// -----------------------------
const { loadEvents } = require('./Handlers/eventHandler');
loadEvents(client);

// -----------------------------
// BOT READY
// -----------------------------
client.once("ready", async () => {
    console.log(`✅ Bot kirjautunut sisään: ${client.user.tag}`);

    try {
        const guild = await client.guilds.fetch(config.guildID);
        await guild.members.fetch();
        console.log(`📦 Guild haettu: ${guild.name}, jäseniä: ${guild.memberCount}`);

        // --- Ticket-panel ---
        const ticketChannel = guild.channels.cache.get(config.ticket.ticketPanelChannelId);
        if (ticketChannel) {
            await ticket.sendTicketPanel(ticketChannel);
            console.log("🎫 Ticket-panel lähetetty kanavalle");
        } else console.warn("⚠️ Ticket-panel -kanavaa ei löytynyt configista!");

        // --- Allowlist-panel ---
        const allowlistChannel = guild.channels.cache.get(config.channels.haeAllowlistChannel);
        if (allowlistChannel) {
            await allowlist.sendAllowlistPanel(allowlistChannel);
            console.log("📨 Allowlist-panel lähetetty kanavalle");
        } else console.warn("⚠️ Allowlist-panel -kanavaa ei löytynyt configista!");

        // --- Watchlist ---
        try {
            const watchlistModule = require('./Functions/watchlist')(client);
            client.watchlist = watchlistModule;
            await watchlistModule.startWatching();
            console.log("👁️ Watchlist moduuli käynnistetty!");
        } catch (err) {
            console.error("❌ Watchlist-moduulin käynnistys epäonnistui:", err);
        }

    } catch (err) {
        console.error("❌ Virhe ready-eventissä:", err);
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
        // --- Allowlist button tai modal ---
        if (
            (interaction.isButton() && interaction.customId === 'create_allowlist') ||
            (interaction.isModalSubmit() && interaction.customId === 'allowlist_modal')
        ) {
            await allowlist.handleInteraction(interaction);
            return;
        }

        // --- Muut ticket interactions ---
        await ticket.handleInteraction(interaction);

    } catch (err) {
        console.error("Error handleInteraction (interactionCreate):", err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Tapahtui virhe interaktiossa.', ephemeral: true });
        }
    }
});

// -----------------------------
// LOGIN
// -----------------------------
client.login(process.env.TOKEN)
    .then(() => console.log("🔑 Bot kirjautunut sisään, TOKEN käytetty"))
    .catch(err => console.error("❌ Bot kirjautuminen epäonnistui:", err));
