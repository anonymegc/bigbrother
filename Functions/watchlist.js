const path = require("path");
const { EmbedBuilder } = require("discord.js");
const config = require(path.resolve(__dirname, "../config.json"));

const WATCHLIST_CHANNEL_ID = config.channels.watchlistChannel;
const ALERT_CHANNEL_ID = config.channels.alertChannel;

let watchlist = new Set();
let alreadyAlerted = new Set();
let guildCache = null;

// 🔔 Lähetetään alert
async function sendAlert(client, member, matchedWord) {
    try {
        const channel = await client.channels.fetch(ALERT_CHANNEL_ID);
        if (!channel) return console.warn("Alert channel not found!");

        const embed = new EmbedBuilder()
            .setTitle("📢 BINGO!")
            .setColor(0xFF0000)
            .setDescription("Jäsen vastaa mustalla listalla olevaa tietoa")
            .addFields(
                { name: "👤 Käyttäjä:", value: `${member.user.tag} (ID: ${member.id})` },
                { name: "🔍 Merkintä:", value: matchedWord }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        await channel.send({ embeds: [embed] });
        console.log(`ALERT lähetetty: ${member.user.tag} vastaa merkintää "${matchedWord}"`);
    } catch (err) {
        console.error("Error viestin lähetyksessä:", err);
    }
}

// 👁 Tarkistaa yhden jäsenen watchlistia vasten
async function checkMemberAgainstWatchlist(client, member) {
    if (!member || !member.user) return;

    const username = member.user.username.toLowerCase();
    const id = member.id.toString();

    for (const entry of watchlist) {
        const key = `${id}-${entry}`;
        if (alreadyAlerted.has(key)) continue;

        if (entry === id || entry === username) {
            await sendAlert(client, member, entry);
            alreadyAlerted.add(key);
        }
    }
}

// 📌 Päivittää watchlistin kanavasta
async function scanWatchlist(client) {
    try {
        const channel = await client.channels.fetch(WATCHLIST_CHANNEL_ID);
        if (!channel) return console.warn("Watchlist channel not found!");

        const messages = await channel.messages.fetch({ limit: 100 });
        console.log(`Watchlist kanavalta haettu ${messages.size} viestiä`);

        watchlist.clear();
        alreadyAlerted.clear();

        for (const msg of messages.values()) {
            const cleaned = msg.content.trim().toLowerCase();
            if (cleaned.length > 0) {
                watchlist.add(cleaned);
                console.log(`Watchlist merkintä lisätty cacheen: "${cleaned}"`);
            }
        }

        console.log(`Watchlist päivitetty: ${watchlist.size} merkintää`);

        // Tarkista olemassa olevat jäsenet
        if (guildCache) {
            guildCache.members.cache.forEach(member =>
                checkMemberAgainstWatchlist(client, member)
            );
        }
    } catch (err) {
        console.error("Error scanning watchlist:", err);
    }
}

// 📝 Uusi/editoitu viesti watchlist-kanavalla
async function handleNewWatchlistMessage(client, message) {
    if (message.channel.id !== WATCHLIST_CHANNEL_ID || message.author.bot) return;

    const cleaned = message.content.trim().toLowerCase();
    if (!cleaned) return;
    if (watchlist.has(cleaned)) return;

    watchlist.add(cleaned);
    console.log(`Uusi watchlist merkintä lisätty: "${cleaned}"`);

    // Tarkista kaikki jäsenet
    if (guildCache) {
        guildCache.members.cache.forEach(member =>
            checkMemberAgainstWatchlist(client, member)
        );
    }
}

module.exports = {
    scanWatchlist,
    checkMemberAgainstWatchlist,
    handleNewWatchlistMessage,
    setGuildCache: (g) => guildCache = g,
    getGuildCache: () => guildCache
};
