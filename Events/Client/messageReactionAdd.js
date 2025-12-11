const { Events } = require("discord.js");
const config = require("../../config.json");

module.exports = {
    name: Events.MessageReactionAdd,
    /**
     * @param {MessageReaction} reaction 
     * @param {User} user
     */
    async execute(reaction, user) {
        // --- Älä reagoi botin omiin reaktioihin ---
        if (user.bot) return;

        // --- Hae täydellinen viesti jos partial ---
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (err) {
                console.error("❌ Error fetching reaction:", err);
                return;
            }
        }

        const channelId = reaction.message.channel.id;

        // --- Tarkistetaan, että reaktio tulee allowlistChannelista ---
        if (channelId !== config.channels.allowlistChannel) return;

        // --- Määritä emoji ---
        const upvote = "👍";
        const downvote = "👎";

        const upvotecount = reaction.message.reactions.cache.get(upvote)?.count - 1 || 0;
        const downvotecount = reaction.message.reactions.cache.get(downvote)?.count - 1 || 0;
        const totalvotecount = upvotecount + downvotecount;

        console.log(`🗳️ Hakemus ${reaction.message.id} saanut uuden reaktion (${reaction.emoji.name}) käyttäjältä ${user.tag}`);
        console.log(`📊 Upvote: ${upvotecount}, Downvote: ${downvotecount}, Total: ${totalvotecount}`);

        // --- Päätös, kun äänestykset täyttävät ehdot (esim. vähintään 3 ääntä) ---
        if (totalvotecount >= 3) {
            const guild = reaction.message.guild;
            const embed = reaction.message.embeds[0];

            if (!embed || !embed.footer) return console.warn("⚠️ Viestissä ei embedia tai footeria");

            // Hae hakijan ID footerista
            const applicantId = embed.footer.text.split("Hakija: ")[1];
            const applicant = guild.members.cache.get(applicantId);

            if (!applicant) return console.warn("⚠️ Hakijaa ei löytynyt guildista");

            if (upvotecount > downvotecount) {
                // --- Hyväksy ---
                const hyvaksytyt = guild.channels.cache.get(config.channels.hyvaksytytChannel);
                if (hyvaksytyt) await hyvaksytyt.send({ embeds: [embed] });

                try {
                    await applicant.send("🎉 Onnittelut, hakemuksesi on hyväksytty! Seuraavaksi pääset odottamaan haastattelua.");
                } catch {
                    console.warn(`⚠️ Ei voitu lähettää DM hakijalle ${applicant.user.tag}`);
                }

                const role = guild.roles.cache.get(config.roles.roleAlHaastattelu);
                if (role) await applicant.roles.add(role);

                console.log(`✅ Hakemus hyväksytty: ${applicant.user.tag}`);

            } else {
                // --- Hylkää ---
                const hylatyt = guild.channels.cache.get(config.channels.hylatytChannel);
                if (hylatyt) await hylatyt.send({ embeds: [embed] });

                try {
                    await applicant.send("❌ Pahoittelut, tällä kertaa arpaonni ei suosinut sinua. Älä lannistu, aina voi hakea uutta!");
                } catch {
                    console.warn(`⚠️ Ei voitu lähettää DM hakijalle ${applicant.user.tag}`);
                }

                console.log(`❌ Hakemus hylätty: ${applicant.user.tag}`);
            }

            // --- Poista alkuperäinen viesti allowlistChannelista ---
            await reaction.message.delete().catch(() => {});
            console.log(`🗑️ Alkuperäinen hakemusviesti poistettu: ${reaction.message.id}`);
        }
    }
};
