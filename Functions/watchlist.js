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

    console.log("👁️  Aloitetaan tarkkailu, isoveli valvoo"); // <-- debug log heti alussa

    // --- Lähetä alertti ---
    async function sendAlert(member, matchedWord) {
        try {
            const channel = await client.channels.fetch(ALERT_CHANNEL_ID);
            if (!channel) return console.error("⚠️ Alert-kanavaa ei löydy");

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
            console.log(`🚨 Alert lähetetty: ${member.user.tag} / "${matchedWord}"`);
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
            if (!channel) return console.error("⚠️ Watchlist-kanavaa ei löydy");

            const messages = await channel.messages.fetch({ limit: 100 });
            watchlist.clear();
            for (const msg of messages.values()) {
                const cleaned = msg.content.trim().toLowerCase().replace(/\s+/g, " ");
                if (cleaned.length > 0) watchlist.add(cleaned);
            }
            console.log(`✅ Watchlist päivitetty: ${watchlist.size} merkintää`);
        } catch (err) {
            console.error("Error scanning watchlist:", err);
        }
    }

    // --- Ready-event ---
    client.once("ready", async () => {
        console.log(`✅ Watchlist ready | Logged in as ${client.user.tag}`);

        try {
            guildCache = await client.guilds.fetch(GUILD_ID);
            await guildCache.members.fetch();
        } catch (err) {
            console.error("Error fetching guild or members:", err);
        }

        await scanWatchlist();

        // Käy läpi kaikki jäsenet
        guildCache?.members.cache.forEach(member => checkMemberAgainstWatchlist(member));
    });

    // --- Uusi jäsen ---
    client.on("guildMemberAdd", async (member) => {
        console.log(`🆕 New member joined: ${member.user.tag}`);
        await checkMemberAgainstWatchlist(member);
    });

    // --- Uusi viesti watchlist-kanavalla ---
    client.on("messageCreate", async (message) => {
        if (message.channel.id !== WATCHLIST_CHANNEL_ID) return;
        if (message.author.bot) return;

        console.log(`📩 Message received in watchlist channel from ${message.author.tag}: "${message.content}"`);

        const cleaned = message.content.trim().toLowerCase().replace(/\s+/g, " ");
        if (cleaned.length === 0) return;

        watchlist.add(cleaned);
        console.log(`📝 Uusi watchlist-merkintä: "${cleaned}"`);

        // Käy läpi kaikki guildin jäsenet ilman fetchiä
        guildCache?.members.cache.forEach(member => checkMemberAgainstWatchlist(member));
    });

    return {
        scanWatchlist,
        checkMemberAgainstWatchlist
    };
};