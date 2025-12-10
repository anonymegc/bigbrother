const path = require('path');
const config = require(path.resolve(__dirname, "../config.json"));
const { EmbedBuilder } = require('discord.js');

const WATCHLIST_CHANNEL_ID = config.channels.watchlistChannel;
const ALERT_CHANNEL_ID = config.channels.alertChannel;
const GUILD_ID = config.guildID;

let watchlist = new Set();
let alreadyAlerted = new Set();
let guildCache = null;

module.exports = (client) => {

    console.log("👁️ Aloitetaan tarkkailu, isoveli valvoo");

    // --- Lähetä alertti ---
    async function sendAlert(member, matchedWord) {
        try {
            const channel = await client.channels.fetch(ALERT_CHANNEL_ID);
            if (!channel) return;
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

    // --- Tarkista jäsen watchlistia vastaan ---
    async function checkMemberAgainstWatchlist(member) {
        if (!member || !member.user) return;
        const username = member.user.username.toLowerCase();
        const tag = member.user.tag.toLowerCase();
        const id = member.id;
        for (const entry of watchlist) {
            const key = `${id}-${entry}`;
            if (alreadyAlerted.has(key)) continue;
            if (entry.includes(id) || entry.includes(username) || entry.includes(tag)) {
                await sendAlert(member, entry);
                alreadyAlerted.add(key);
            }
        }
    }

    // --- Skannaa watchlist-kanava ---
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
            console.log(`📜 Watchlist päivitetty: ${watchlist.size} merkintää`);
        } catch (err) {
            console.error("Error scanning watchlist:", err);
        }
    }

    // --- Ready-event (käynnistetään ready-eventin sisällä indexistä) ---
    async function startWatching() {
        try {
            guildCache = await client.guilds.fetch(GUILD_ID);
            await guildCache.members.fetch();
            await scanWatchlist();

            // Käydään läpi kaikki jäsenet
            guildCache.members.cache.forEach(member => checkMemberAgainstWatchlist(member));

            console.log("✅ Watchlist on nyt aktiivinen");
        } catch (err) {
            console.error("❌ Virhe watchlistin käynnistyksessä:", err);
        }
    }

    // --- Uusi jäsen ---
    client.on("guildMemberAdd", async (member) => {
        await checkMemberAgainstWatchlist(member);
    });

    // --- Uusi viesti watchlist-kanavalla ---
    client.on("messageCreate", async (message) => {
        if (message.channel.id !== WATCHLIST_CHANNEL_ID || message.author.bot) return;
        const cleaned = message.content.trim().toLowerCase().replace(/\s+/g, " ");
        if (cleaned.length === 0) return;
        watchlist.add(cleaned);
        console.log(`➕ Uusi watchlist-merkintä: "${cleaned}"`);
        guildCache?.members.cache.forEach(member => checkMemberAgainstWatchlist(member));
    });

    return { startWatching, checkMemberAgainstWatchlist, scanWatchlist };
};