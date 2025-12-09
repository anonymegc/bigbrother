const path = require("path");
const config = require(path.resolve(__dirname, "../config.json"));
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");

module.exports = {
    // Lähetä ticket-panel kanavalle
    async sendTicketPanel(channel) {
        const embed = new EmbedBuilder()
            .setTitle("Lässyn lässyn lää")
            .setDescription("Luo uusi tiketti painamalla nappia alla.")
            .setColor("Blue");

        const button = new ButtonBuilder()
            .setCustomId("create_ticket")
            .setLabel("Luo tiketti")
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await channel.send({ embeds: [embed], components: [row] });
    },

    // Käsittele kaikki interaktiot: painikkeet & dropdown
    async handleInteraction(interaction) {
        if (interaction.isButton()) {
            if (interaction.customId === "create_ticket") {
                await this.showTicketMenu(interaction);
            } else if (interaction.customId.startsWith("close_ticket")) {
                await this.closeTicket(interaction);
            }
        }

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === "ticket_select") {
                await this.createTicketChannel(interaction);
            }
        }
    },

    // Näytä dropdown aihevalinnalla
    async showTicketMenu(interaction) {
        const menu = new StringSelectMenuBuilder()
            .setCustomId("ticket_select")
            .setPlaceholder("Valitse ticketin aihe")
            .addOptions([
                { label: "Bug report", value: "bugreport" },
                { label: "YP report", value: "ypreport" },
                { label: "Pelaaja report", value: "playerreport" },
                { label: "Muut asiat", value: "other" }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.reply({ content: "Valitse aihe:", components: [row], ephemeral: true });
    },

    // Luo ticket-kanava
    async createTicketChannel(interaction) {
        const guild = interaction.guild;
        const user = interaction.user;
        const selected = interaction.values[0];

        const channel = await guild.channels.create({
            name: `ticket-${selected}-${user.username}`.toLowerCase().replace(/ /g, "-"),
            type: ChannelType.GuildText,
            parent: config.ticket.ticketCategoryId,
            permissionOverwrites: [
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: config.ticket.roleYllapito, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: config.ticket.roleValvoja, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle(`Tiketti: ${selected}`)
            .setDescription(`Tervetuloa ticket-kanavaasi!\nStaff seuraa tilannetta.`)
            .setColor("Green");

        const closeButton = new ButtonBuilder()
            .setCustomId("close_ticket")
            .setLabel("Sulje tiketti")
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(closeButton);

        await channel.send({ content: `<@${user.id}>`, embeds: [embed], components: [row] });
        await interaction.reply({ content: `Ticket luotu: ${channel}`, ephemeral: true });
    },

    // Lisää jäsen ticket-kanavaan
    async addMember(interaction, member) {
        const channel = interaction.channel;
        if (!channel) return interaction.reply({ content: "Kanavaa ei löytynyt.", ephemeral: true });

        await channel.permissionOverwrites.edit(member.id, { ViewChannel: true, SendMessages: true });
        interaction.reply({ content: `${member} lisätty ticketiin!`, ephemeral: true });
    },

    // Poista jäsen ticket-kanavasta
    async removeMember(interaction, member) {
        const channel = interaction.channel;
        if (!channel) return interaction.reply({ content: "Kanavaa ei löytynyt.", ephemeral: true });

        await channel.permissionOverwrites.delete(member.id);
        interaction.reply({ content: `${member} poistettu ticketistä!`, ephemeral: true });
    },

    // Sulje ticket
    async closeTicket(interaction) {
        const channel = interaction.channel;
        if (!channel) return interaction.reply({ content: "Kanavaa ei löytynyt.", ephemeral: true });

        await interaction.reply({ content: "Ticket suljetaan 10 sekunnin kuluttua...", ephemeral: true });

        setTimeout(async () => {
            const archiveChannel = interaction.guild.channels.cache.get(config.ticket.archiveChannelId);
            if (archiveChannel) {
                const messages = await channel.messages.fetch({ limit: 100 });
                const archiveText = messages.map(m => `${m.author.tag}: ${m.content}`).join("\n");

                await archiveChannel.send({ content: `Tiketti ${channel.name} arkistoitu:\n\n${archiveText}` });
            }

            await channel.delete().catch(console.error);
        }, 10000);
    }
};
