const { 
    EmbedBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} = require('discord.js');
const config = require('../config.json');

module.exports = {
    // --- Lähetä allowlist panel ---
    async sendAllowlistPanel(channel) {
        console.log("[DEBUG] sendAllowlistPanel kutsuttu");
        const embed = new EmbedBuilder()
            .setTitle('Hae allowlistiä palvelimellemme!')
            .setDescription('Paina nappia ja täytä hakemuslomake.')
            .setColor('Blue');

        const button = new ButtonBuilder()
            .setCustomId('create_allowlist')
            .setLabel('Hae allowlistiä')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        const sentMessage = await channel.send({ embeds: [embed], components: [row] });
        console.log("[DEBUG] Allowlist panel lähetetty:", sentMessage.id);
    },

    // --- Käsittele napin painallus tai modal submit ---
    async handleInteraction(interaction) {
        console.log("[DEBUG] handleInteraction kutsuttu:", interaction.type);

        try {
            if (interaction.isButton() && interaction.customId === 'create_allowlist') {
                console.log("[DEBUG] Napin painallus havaittu, avataan modal...");
                await this.showAllowlistModal(interaction);
                console.log("[DEBUG] Modal näytetty");
                return;
            } 

            if (interaction.isModalSubmit() && interaction.customId === 'allowlist_modal') {
                console.log("[DEBUG] Modal submit havaittu, käsitellään hakemus...");
                await this.handleModalSubmit(interaction);
                console.log("[DEBUG] Modal submit käsitelty");
                return;
            }

            console.log("[DEBUG] Interaction ei ollut nappi tai modal submit");
        } catch (err) {
            console.error('[ERROR] Virhe handleInteractionissa:', err);
            if (!interaction.replied && !interaction.deferred) {
                console.log("[DEBUG] Lähetetään fallback-viesti käyttäjälle");
                await interaction.reply({ content: '❌ Tapahtui virhe interaktiossa.', ephemeral: true });
            }
        }
    },

    // --- Näytä modal ---
    async showAllowlistModal(interaction) {
        console.log("[DEBUG] showAllowlistModal kutsuttu");
        const modal = new ModalBuilder()
            .setCustomId('allowlist_modal')
            .setTitle('Allowlist Hakemus');

        const inputs = [
            { id: 'discordName', label: 'DC käyttäjänimi?', style: TextInputStyle.Short },
            { id: 'realAge', label: 'IRL-ikä?', style: TextInputStyle.Short },
            { id: 'experience', label: 'Kokemuksesi roolipelaamisesta?', style: TextInputStyle.Paragraph },
            { id: 'aboutYou', label: 'Kerro itsestäsi roolipelaajana?', style: TextInputStyle.Paragraph },
            { id: 'character', label: 'Kerro tulevasta hahmostasi?', style: TextInputStyle.Paragraph }
        ];

        const rows = inputs.map(input =>
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId(input.id)
                    .setLabel(input.label)
                    .setStyle(input.style)
                    .setRequired(true)
            )
        );

        modal.addComponents(...rows);

        console.log("[DEBUG] Näytetään modal interaktiolle");
        await interaction.showModal(modal);
    },

    // --- Käsittele modal submit ---
    async handleModalSubmit(interaction) {
        console.log("[DEBUG] handleModalSubmit kutsuttu:", interaction.user.tag);

        const discordName = interaction.fields.getTextInputValue('discordName');
        const realAge = interaction.fields.getTextInputValue('realAge');
        const experience = interaction.fields.getTextInputValue('experience');
        const aboutYou = interaction.fields.getTextInputValue('aboutYou');
        const character = interaction.fields.getTextInputValue('character');

        console.log("[DEBUG] Modal input arvot haettu");

        // --- Lähetä ilmoitus DM ---
        try {
            console.log("[DEBUG] Lähetetään DM käyttäjälle");
            await interaction.user.send('✅ Hakemuksesi on otettu vastaan. Henkilökunta käsittelee tämän mahdollisimman pian!');
            console.log("[DEBUG] DM lähetetty");
        } catch (err) {
            console.error("[WARN] DM ei onnistunut:", err);
        }

        // --- Lähetä hakemus allowlist-kanavalle ---
        const allowlistChannel = interaction.guild.channels.cache.get(config.channels.allowlistChannel);
        if (!allowlistChannel) {
            console.error('[ERROR] allowlistChannel ei löytynyt configista!');
            if (!interaction.replied) {
                console.log("[DEBUG] Lähetetään virheviesti käyttäjälle");
                await interaction.reply({ content: '❌ Tapahtui virhe, kanavaa ei löydy!', ephemeral: true });
            }
            return;
        }

        console.log("[DEBUG] Lähetetään hakemuskanavalle:", allowlistChannel.id);

        const embed = new EmbedBuilder()
            .setTitle('Uusi Allowlist-hakemus')
            .setColor('Green')
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .addFields(
                { name: 'DC käyttäjänimi', value: discordName || 'Ei annettu' },
                { name: 'IRL-ikä', value: realAge || 'Ei annettu' },
                { name: 'Kokemus roolipelaamisesta', value: experience || 'Ei annettu' },
                { name: 'Itsestäsi roolipelaajana', value: aboutYou || 'Ei annettu' },
                { name: 'Tuleva hahmo', value: character || 'Ei annettu' },
            )
            .setFooter({ text: `Hakija: ${interaction.user.id}` })
            .setTimestamp();

        try {
            const sentMessage = await allowlistChannel.send({ embeds: [embed] });
            console.log("[DEBUG] Hakemus lähetetty kanavalle:", sentMessage.id);

            await sentMessage.react('👍');
            await sentMessage.react('👎');
            console.log("[DEBUG] Reaktiot lisätty viestiin");

            if (!interaction.replied) {
                await interaction.reply({ content: '✅ Hakemus lähetetty onnistuneesti!', ephemeral: true });
                console.log("[DEBUG] Interaction reply lähetetty");
            }
        } catch (err) {
            console.error("[ERROR] Hakemuksen lähetys kanavalle epäonnistui:", err);
            if (!interaction.replied) {
                await interaction.reply({ content: '❌ Hakemuksen lähetys epäonnistui.', ephemeral: true });
            }
        }
    }
};
