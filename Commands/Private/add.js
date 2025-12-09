const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const ticket = require("../../Functions/ticket");
const config = require("../../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("lisää")
        .setDescription("Lisää käyttäjä ticketiin.")
        .addUserOption(option =>
            option.setName("käyttäjä")
                .setDescription("Käyttäjä lisättäväksi ticketiin.")
                .setRequired(true)
        ),

    async execute(interaction) {
        const member = interaction.options.getMember("käyttäjä");

        if (!member) {
            return interaction.reply({
                content: "Käyttäjää ei löytynyt.",
                flags: 64 // = ephemeral
            });
        }

        // ————— ROOLITARKISTUS —————
        const allowedRoles = [
            config.roleYllapito,
            config.roleValvoja
        ];

        const hasRole = interaction.member.roles.cache
            .some(role => allowedRoles.includes(role.id));

        if (!hasRole) {
            return interaction.reply({
                content: "Sinulla ei ole lupaa käyttää tätä komentoa.",
                flags: 64
            });
        }

        // ————— KUTSUTAAN TICKET-FUNKTIOTA —————
        try {
            const result = await ticket.addMember(interaction, member);

            // addMember voi palauttaa viestin mikäli käyttäjä on jo lisätty
            if (result === "already_added") {
                return interaction.reply({
                    content: `${member.user.tag} on jo tässä ticketissä.`,
                    flags: 64
                });
            }

            return interaction.reply({
                content: `${member.user.tag} lisättiin ticketiin.`,
                flags: 64
            });

        } catch (err) {
            console.error("Virhe lisää-komennossa:", err);

            return interaction.reply({
                content: "Tapahtui virhe käyttäjän lisäämisessä.",
                flags: 64
            });
        }
    }
};
