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
        const embed = new EmbedBuilder()
            .setTitle('Hae allowlistiä palvelimellemme!')
            .setDescription('Paina nappia ja täytä hakemuslomake.')
            .setColor('Blue');

        const button = new ButtonBuilder()
            .setCustomId('create_allowlist')
            .setLabel('Hae allowlistiä')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await channel.send({ embeds: [embed], components: [row] });
    },

    // --- Käsittele interaction ---
    async handleInteraction(interaction) {
        if (interaction.isButton()) {
            if (interaction.customId === 'create_allowlist') {
                await this.showAllowlistModal(interaction);
            }
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'allowlist_modal') {
                await this.handleModalSubmit(interaction);
            }
        }
    },

    // --- Näytä modal ---
    async showAllowlistModal(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('allowlist_modal')
            .setTitle('Allowlist Hakemus');

        const inputs = [
            { id: 'discordName', label: 'DC käyttäjänimi?', style: TextInputStyle.Short },
            { id: 'realAge', label: 'IRL-ikä?', style: TextInputStyle.Short },
            { id: 'experience', label: 'Kokemuksesi roolipelaamisesta?', style: TextInputStyle.Paragraph },
            { id: 'why', label: 'Miksi haet allowlistiä palvelimellemme?', style: TextInputStyle.Paragraph },
            { id: 'aboutYou', label: 'Kerro itsestäsi roolipelaajana?', style: TextInputStyle.Paragraph },
            { id: 'character', label: 'Kerro tulevasta hahmostasi?', style: TextInputStyle.Paragraph },
            { id: 'free', label: 'Vapaa sana!', style: TextInputStyle.Paragraph },
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
        await interaction.showModal(modal);
    },

    // --- Käsittele modal submit ---
    async handleModalSubmit(interaction) {
        const discordName = interaction.fields.getTextInputValue('discordName');
        const realAge = interaction.fields.getTextInputValue('realAge');
        const experience = interaction.fields.getTextInputValue('experience');
        const why = interaction.fields.getTextInputValue('why');
        const aboutYou = interaction.fields.getTextInputValue('aboutYou');
        const character = interaction.fields.getTextInputValue('character');
        const free = interaction.fields.getTextInputValue('free');

        // --- Lähetä hakijan DM ---
        try {
            await interaction.user.send('✅ Hakemuksesi on otettu vastaan. Henkilökunta käsittelee tämän mahdollisimman pian!');
        } catch (err) {
            console.warn(`⚠️ Ei voitu lähettää DM hakijalle ${interaction.user.tag}:`, err);
        }

        // --- Lähetä hakemus allowlistChannel ---
        const allowlistChannel = interaction.guild.channels.cache.get(config.channels.allowlistChannel);
        if (!allowlistChannel) return console.error('⚠️ allowlistChannel ei löytynyt configista!');

        const embed = new EmbedBuilder()
            .setTitle('Uusi Allowlist-hakemus')
            .setColor('Green')
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .addFields(
                { name: 'DC käyttäjänimi', value: discordName },
                { name: 'IRL-ikä', value: realAge },
                { name: 'Kokemus roolipelaamisesta', value: experience },
                { name: 'Miksi haet allowlistiä', value: why },
                { name: 'Itsestäsi roolipelaajana', value: aboutYou },
                { name: 'Tuleva hahmo', value: character },
                { name: 'Vapaa sana', value: free }
            )
            .setFooter({ text: `Hakija: ${interaction.user.id}` })
            .setTimestamp();

        const sentMessage = await allowlistChannel.send({ embeds: [embed] });

        // --- Lisää heti 👍 ja 👎 reaktiot ---
        await sentMessage.react('👍');
        await sentMessage.react('👎');

        // --- Vastaa käyttäjälle että modal hyväksytty ---
        await interaction.reply({ content: '✅ Hakemus lähetetty onnistuneesti!', ephemeral: true });
    }
};
