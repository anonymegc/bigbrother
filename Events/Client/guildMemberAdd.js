module.exports = {
    name: "guildMemberAdd",
    async execute(member) {
        const guild = member.guild
        const channel = client.channels.cache.get(config.channels.welcomeChannel)
        const welcomeRole = guild.roles.cache.get("1447942712970973245")

        if (!welcomeChannel || !welcomeRole) {
            console.error("Welcome channel or role not found.")
            return
        }

        await welcomeChannel.send(`${member} liittyi Discordiin. Tervetuloa palvelimelle!`)

        try {
            await member.roles.add(welcomeRole)
        } catch (error) {
            console.error("Error adding welcome role:", error)
        }
    }
}
