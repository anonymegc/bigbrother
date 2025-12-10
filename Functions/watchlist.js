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

    // --- Lähetä alertti ---
    async function sendAlert(member, matchedWord) {
        try {
            const channel = await client.channels.fetch(ALERT_CHANNEL_ID);
            if (!channel) {
                console.warn("⚠️ Alert-kanavaa ei löydy!");
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle("📢 Watchlist BINGO!")
                .setColor(0xFF0000)
                .setDescription("Jäsen vastaa mustalla listalla olevaa tietoa")
                .addFields(
                    { name: "👤 Käyttäjä:", value: `${member.user.tag} (ID: ${member.id})` },
                    { name: "🔍 Nimi löytyy listasta:", value: matchedWord }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            console.log(`🚨 Alertti lähetetty: ${member.user.tag} -> ${matchedWord}`);
        } catch (err) {
            console.error("❌ Error viestin lähetyksessä:", err);
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
            if (!channel) {
                console.warn("⚠️ Watchlist-kanavaa ei löydy!");
                return;
            }

            const messages = await channel.messages.fetch({ limit: 100 });
            watchlist.clear();

            for (const msg of messages.values()) {
                const cleaned = msg.content.trim().toLowerCase().replace(/\s+/g, " ");
                if (cleaned.length > 0) watchlist.add(cleaned);
            }

            console.log(`👁️ Watchlist päivitetty: ${watchlist.size} merkintää`);
        } catch (err) {
            console.error("❌ Error scanning watchlist:", err);
        }
    }

    // --- Käynnistä watchlist ---
    async function startWatching() {
        try {
            console.log("👁️ Aloitetaan tarkkailu, isoveli valvoo...");

            guildCache = await client.guilds.fetch(GUILD_ID);
            if (!guildCache) throw new Error("⚠️ Guild ei löytynyt!");

            await guildCache.members.fetch();

            // Skannaa ensin kanava
            await scanWatchlist();

            // Tarkista kaikki jäsenet watchlistia vastaan
            guildCache.members.cache.forEach(member => checkMemberAgainstWatchlist(member));

            // Event: uusi jäsen
            client.on("guildMemberAdd", async (member) => {
                console.log(`➕ Uusi jäsen liittyi: ${member.user.tag}`);
                await checkMemberAgainstWatchlist(member);
            });

            // Event: uusi viesti watchlist-kanavalla
            client.on("messageCreate", async (message) => {
                if (message.channel.id !== WATCHLIST_CHANNEL_ID || message.author.bot) return;

                const cleaned = message.content.trim().toLowerCase().replace(/\s+/g, " ");
                if (cleaned.length === 0) return;

                watchlist.add(cleaned);
                console.log(`➕ Uusi watchlist-merkintä lisätty: "${cleaned}"`);

                // Tarkista kaikki jäsenet heti
                guildCache.members.cache.forEach(member => checkMemberAgainstWatchlist(member));
            });

            console.log("✅ Watchlist valmis ja kuuntelee uusia viestejä & liittyviä jäseniä.");
        } catch (err) {
            console.error("❌ Watchlist startWatching-virhe:", err);
        }
    }

    return {
        startWatching,
        scanWatchlist,
        checkMemberAgainstWatchlist
    };
};