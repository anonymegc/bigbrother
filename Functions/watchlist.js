const { EmbedBuilder } = require("discord.js");

module.exports = (client) => {

    const WATCHLIST_CHANNEL_ID = process.env.WATCHLIST_CHANNEL_ID;
    const ALERT_CHANNEL_ID = process.env.ALERT_CHANNEL_ID;
    const GUILD_ID = process.env.GUILD_ID;

    let watchlist = new Set();
    let alreadyAlerted = new Set();
    let guildCache = null;

    // 🔔 Lähetetään alert
    async function sendAlert(member, matchedWord) {
        try {
            const channel = await client.channels.fetch(ALERT_CHANNEL_ID);

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
        const id = member.id;

        for (const entry of watchlist) {
            const key = `${id}-${entry}`;
            if (alreadyAlerted.has(key)) continue;

            if (
                entry.includes(id) ||
                entry.includes(username) ||
                entry.includes(tag)
            ) {
                await sendAlert(member, entry);
                alreadyAlerted.add(key);
            }
        }
    }

    // 📌 Päivittää watchlistin kanavasta
    async function scanWatchlist() {
        try {
            const channel = await client.channels.fetch(WATCHLIST_CHANNEL_ID);
            if (!channel) return;

            const messages = await channel.messages.fetch({ limit: 100 });

            watchlist.clear();
            for (const msg of messages.values()) {
                const cleaned = msg.content.trim().toLowerCase().replace(/\s+/g, " ");
                if (cleaned.length > 0) watchlist.add(cleaned);
            }

            console.log("Watchlist päivitetty:", watchlist.size, "merkintää");
        } catch (err) {
            console.error("Error scanning watchlist:", err);
        }
    }

    return {
        scanWatchlist,
        checkMemberAgainstWatchlist,

        getGuildCache: () => guildCache,
        setGuildCache: (g) => guildCache = g,

        addWatchlistEntry: (entry) => watchlist.add(entry)
    };
};
