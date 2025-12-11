const { EmbedBuilder } = require("discord.js");
const config = require("../config.json");

const WATCHLIST_CHANNEL_ID = config.channels.watchlistChannel;
const ALERT_CHANNEL_ID = config.channels.alertChannel;
const GUILD_ID = config.guildID;

let watchlist = new Set();
let alreadyAlerted = new Set();

module.exports = (client) => {

    // --- Lähetä alertti alertChanneliin ---
    async function sendAlert(member, matchedWord) {
        try {
            const alertChannel = await client.channels.fetch(ALERT_CHANNEL_ID);
            if (!alertChannel) return console.error("❌ Alert-kanavaa ei löytynyt!");

            const embed = new EmbedBuilder()
                .setTitle("⚠️ Watchlist-osuma!")
                .setColor(0xFF0000)
                .setDescription("Jäsen vastaa watchlistissä olevaa tietoa")
                .addFields(
                    { name: "👤 Käyttäjä", value: `${member.user.tag} (ID: ${member.id})` },
                    { name: "🔍 Watchlist-osuma", value: matchedWord }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();

            await alertChannel.send({ embeds: [embed] });
            console.log(`🚨 Alertti lähetetty: ${member.user.tag} -> ${matchedWord}`);

        } catch (err) {
            console.error("❌ Error alertin lähetyksessä:", err);
        }
    }

    // --- Tarkista jäsen watchlistiä vasten ---
    async function checkMemberAgainstWatchlist(member) {
        if (!member?.user) return;

        const username = member.user.username.toLowerCase();
        const tag = member.user.tag.toLowerCase();
        const id = member.id;

        for (const entry of watchlist) {
            const key = `${id}-${entry}`;
            if (alreadyAlerted.has(key)) continue;

            // Vain täsmälleen sama nimi, tag tai ID
            if (entry === id || entry === username || entry === tag) {
                console.log(`⚠️ ${member.user.tag} vastaa watchlistia: ${entry}`);
                await sendAlert(member, entry);
                alreadyAlerted.add(key);
            }
        }
    }

    // --- Skannaa watchlist-kanavan viestit ---
    async function scanWatchlist() {
        try {
            const channel = await client.channels.fetch(WATCHLIST_CHANNEL_ID);
            if (!channel) return console.error("❌ Watchlist-kanavaa ei löytynyt!");

            const messages = await channel.messages.fetch({ limit: 100 });
            watchlist.clear();

            for (const msg of messages.values()) {
                const cleaned = msg.content.trim().toLowerCase();
                if (cleaned) watchlist.add(cleaned);
            }

            console.log(`👁️ Watchlist päivitetty: ${watchlist.size} merkintää`);
        } catch (err) {
            console.error("❌ Error scanning watchlist:", err);
        }
    }

    // --- Käynnistä watchlist-tarkkailu ---
    async function startWatching() {
        console.log("👁️ Käynnistetään watchlist-tarkkailu...");

        try {
            const guild = await client.guilds.fetch(GUILD_ID);
            await guild.members.fetch();

            await scanWatchlist();

            // Tarkista kaikki jäsenet heti
            guild.members.cache.forEach(member => checkMemberAgainstWatchlist(member));

            // Event: uusi jäsen liittyy
            client.on("guildMemberAdd", async (member) => {
                console.log(`➕ Uusi jäsen liittyi: ${member.user.tag}`);
                await checkMemberAgainstWatchlist(member);
            });

            // Event: uusi viesti watchlist-kanavalla
            client.on("messageCreate", async (message) => {
                if (message.channel.id !== WATCHLIST_CHANNEL_ID || message.author.bot) return;

                const cleaned = message.content.trim().toLowerCase();
                if (!cleaned) return;

                watchlist.add(cleaned);
                console.log(`➕ Uusi watchlist-merkintä lisätty: "${cleaned}"`);

                // Tarkista heti kaikki jäsenet
                guild.members.cache.forEach(member => checkMemberAgainstWatchlist(member));
            });

            console.log("✅ Watchlist-tarkkailu käynnistetty!");
        } catch (err) {
            console.error("❌ Watchlist startWatching epäonnistui:", err);
        }
    }

    return {
        startWatching,
        scanWatchlist,
        checkMemberAgainstWatchlist
    };
};