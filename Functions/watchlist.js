const path = require("path");
const { EmbedBuilder } = require("discord.js");
const config = require(path.resolve(__dirname, "../config.json"));

module.exports = (client) => {
    const WATCHLIST_CHANNEL_ID = config.channels.watchlistChannel;
    const ALERT_CHANNEL_ID = config.channels.alertChannel;
    const GUILD_ID = config.guildID;

    let watchlist = new Set();
    let alreadyAlerted = new Set();
    let guildCache = null;

    // 🔔 Lähetetään alert
    async function sendAlert(member, matchedWord) {
        try {
            const channel = await client.channels.fetch(ALERT_CHANNEL_ID);
            if (!channel) return console.warn("Alert channel not found!");

            const embed = new EmbedBuilder()
                .setTitle("📢 BINGO!")
                .setColor(0xFF0000)
                .setDescription("Jäsen vastaa mustalla listalla olevaa tietoa")
                .addFields(
                    { name: "👤 Käyttäjä:", value: `${member.user.tag} (ID: ${member.id})` },
                    { name: "🔍 Nimi löytyy listasta:", value: matchedWord }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        } catch (err) {
            console.error("Error viestin lähetyksessä:", err);
        }
    }

    // 👁 Tarkistaa yhden jäsenen watchlistia vasten
    async function checkMemberAgainstWatchlist(member) {
        if (!member || !member.user) return;

        const username = member.user.username.toLowerCase();
        const tag = member.user.tag.toLowerCase();
        const id = member.id.toString();

        for (const entry of watchlist) {
            const key = `${id}-${entry}`;
            if (alreadyAlerted.has(key)) continue;

            if (entry === id || entry === username || entry === tag) {
                await sendAlert(member, entry);
                alreadyAlerted.add(key);
            }
        }
    }

    // 📌 Päivittää watchlistin kanavasta ja tarkistaa olemassa olevat jäsenet
    async function scanWatchlist() {
        try {
            const channel = await client.channels.fetch(WATCHLIST_CHANNEL_ID);
            if (!channel) return console.warn("Watchlist channel not found!");

            const messages = await channel.messages.fetch({ limit: 100 });
            console.log("Fetched watchlist messages:", messages.size);

            watchlist.clear();
            for (const msg of messages.values()) {
                const cleaned = msg.content.trim().toLowerCase().replace(/\s+/g, " ");
                if (cleaned.length > 0) watchlist.add(cleaned);
            }

            console.log("Watchlist päivitetty:", watchlist.size, "merkintää");

            // Käydään läpi kaikki jo olemassa olevat jäsenet
            if (guildCache) {
                guildCache.members.cache.forEach(member => checkMemberAgainstWatchlist(member));
            }
        } catch (err) {
            console.error("Error scanning watchlist:", err);
        }
    }

    // Lisää watchlistiin uuden merkinnän ja tarkistaa jäsenet
    async function addWatchlistEntry(entry) {
        if (!entry || entry.trim().length === 0) return;

        const cleaned = entry.trim().toLowerCase().replace(/\s+/g, " ");
        watchlist.add(cleaned);
        console.log(`Uusi watchlist-merkintä: "${cleaned}"`);

        if (guildCache) {
            guildCache.members.cache.forEach(member => checkMemberAgainstWatchlist(member));
        }
    }

    return {
        scanWatchlist,
        checkMemberAgainstWatchlist,
        getGuildCache: () => guildCache,
        setGuildCache: (g) => guildCache = g,
        addWatchlistEntry
    };
};
