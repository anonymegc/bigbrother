const path = require("path");
const fs = require("fs");
const config = require(path.resolve(__dirname, "../config.json"));
const { 
    EmbedBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ChannelType, 
    PermissionFlagsBits 
} = require("discord.js");

module.exports = {
    // --- TICKET PANEL ---
    async sendTicketPanel(channel) {
        const embed = new EmbedBuilder()
            .setTitle("Avaa uusi tiketti!")
            .setDescription("Valitse alta mikä aihe kuvastaa ongelmaasi parhaiten:")
            .setColor("Red");

        const button = new ButtonBuilder()
            .setCustomId("create_ticket")
            .setLabel("Luo tiketti")
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await channel.send({ embeds: [embed], components: [row] });
    },

    // --- HANDLER ---
    async handleInteraction(interaction) {
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

        try {
            if (interaction.isButton()) {
                if (interaction.customId === "create_ticket") {
                    await this.showTicketMenu(interaction);
                } else if (interaction.customId === "close_ticket") {
                    await this.closeTicket(interaction);
                }
            }

            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === "ticket_select") {
                    await this.createTicketChannel(interaction);
                }
            }

        } catch (err) {
            console.error("Virhe handleInteractionissä:", err);
        }
    },

    // --- SHOW DROPDOWN ---
    async showTicketMenu(interaction) {
        const menu = new StringSelectMenuBuilder()
            .setCustomId("ticket_select")
            .setPlaceholder("Valitse ticketin aihe")
            .addOptions([
                { label: "Bug-report", value: "bugreport" },
                { label: "YP-report", value: "ypreport" },
                { label: "Pelaaja-report", value: "playerreport" },
                { label: "Muut asiat", value: "other" }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        // Ephemeral menu (flags: 64 = ephemeral)
        await interaction.reply({
            content: "Valitse aihe:",
            components: [row],
            flags: 64
        });
    },

    // --- CREATE TICKET CHANNEL ---
    async createTicketChannel(interaction) {
        const guild = interaction.guild;
        const user = interaction.user;
        const selected = interaction.values[0];

        // Remove the dropdown immediately
        await interaction.update({
            content: `🎫 Tiketti luotu: **${selected}**`,
            components: []
        });

        const channel = await guild.channels.create({
            name: `ticket-${selected}-${user.username}`
                .toLowerCase()
                .replace(/ /g, "-"),
            type: ChannelType.GuildText,
            parent: config.ticket.ticketCategoryId,
            permissionOverwrites: [
                { id: user.id, allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory
                ]},

                { id: config.ticket.roleYllapito, allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory
                ]},

                { id: config.ticket.roleValvoja, allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory
                ]},

                { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },

                { id: guild.members.me.id, allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.ManageChannels
                ]}
            ]
        });

        await channel.setTopic(`ticketCreator:${user.id}`);

        const embed = new EmbedBuilder()
            .setTitle(`Tiketti: ${selected}`)
            .setDescription(`Kerro tarkemmin, mitä asiasi koskee.\nHenkilökunta auttaa sinua mahdollisimman pian.`)
            .setColor("Green");

        const closeButton = new ButtonBuilder()
            .setCustomId("close_ticket")
            .setLabel("Sulje tiketti")
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(closeButton);

        await channel.send({ 
            content: `<@${user.id}>`, 
            embeds: [embed], 
            components: [row] 
        });
    },

    // --- CLOSE TICKET ---
    async closeTicket(interaction) {
        const channel = interaction.channel;
        if (!channel) return;

        const userClosing = interaction.user;

        await interaction.reply({
            content: "⏳ Ticket suljetaan muutaman sekunnin kuluttua...",
            flags: 64
        });

        setTimeout(async () => {
            try {
                const archiveChannel = interaction.guild.channels.cache.get(
                    config.ticket.archiveChannelId
                );

                if (!archiveChannel) {
                    return;
                }

                let messages;
                try {
                    messages = await channel.messages.fetch({ limit: 100 });
                } catch (err) {
                    console.error("Viestien haku epäonnistui:", err);
                    messages = [];
                }

                const participants = [...new Set(messages.map(m => m.author.tag))];

                const creatorId = channel.topic?.split("ticketCreator:")[1];
                const ticketCreator = interaction.guild.members.cache.get(creatorId)?.user.tag || "Tuntematon";

                // Build transcript
                let transcript = 
`=== Tiketti: ${channel.name} ===
Aihe: ${channel.name.split("-")[1]}
Luonut: ${ticketCreator}
Sulki: ${userClosing.tag}
Osallistujat: ${participants.join(", ")}

--- Viestit ---
`;

                messages.reverse().forEach(m => {
                    transcript += `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}\n`;
                });

                const filePath = `./transcript-${channel.name}.txt`;
                fs.writeFileSync(filePath, transcript);

                const embed = new EmbedBuilder()
                    .setTitle(`Tiketti arkistoitu: ${channel.name}`)
                    .addFields(
                        { name: "Tiketin nimi", value: channel.name, inline: true },
                        { name: "Aihe", value: channel.name.split('-')[1], inline: true },
                        { name: "Luonut", value: ticketCreator, inline: true },
                        { name: "Osallistujat", value: participants.join(", ") || "Ei osallistujia" },
                        { name: "Sulki", value: userClosing.tag, inline: true }
                    )
                    .setColor("White");

                await archiveChannel.send({ embeds: [embed], files: [filePath] });

                fs.unlinkSync(filePath);

                await channel.delete().catch(() => {});

            } catch (err) {
                console.error("Virhe ticketin sulkemisessa:", err);
            }

        }, 3000);
    },

    // --- ADD MEMBER ---
    async addMember(interaction, member) {
        const channel = interaction.channel;

        await channel.permissionOverwrites.edit(member.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });

        await interaction.reply({ 
            content: `${member} lisätty tikettiin!`, 
            flags: 64 
        });
    },

    // --- REMOVE MEMBER ---
    async removeMember(interaction, member) {
        const channel = interaction.channel;

        await channel.permissionOverwrites.delete(member.id);

        await interaction.reply({ 
            content: `${member} poistettu tiketistä!`, 
            flags: 64 
        });
    }
};
