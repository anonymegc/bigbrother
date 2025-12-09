async function loadCommands(client) {
    const { loadFiles } = require("../Functions/fileLoader")
    const ascii = require("ascii-table")
    const table = new ascii().setHeading("Komennot", "Status")

    await client.commands.clear()

    let commandsArray = []

    const Files = await loadFiles("Commands")

    Files.forEach((file) => {
        const command = require(file)
        client.commands.set(command.data.name, command)

        commandsArray.push(command.data.toJSON())

        table.addRow(command.data.name, "🟩")
    })

    client.application.commands.set(commandsArray)

    return console.log(table.toString(), "\nKomennot ladattu")
}

module.exports = { loadCommands }
/*
const { loadFiles } = require("../Functions/fileLoader")
const ascii = require("ascii-table")
const config = require("../config.json")

async function loadCommands(client) {
    const table = new ascii().setHeading("Komennot", "Status")

    await client.commands.clear()

    const files = await loadFiles("Commands")

    const commandsArray = await Promise.all(files.map(async (file) => {
        const command = require(file)
        client.commands.set(command.data.name, command)
        table.addRow(command.data.name, "🟩")
        return command.data.toJSON()
    }))

    if (client.application) {
        await client.application.commands.set(commandsArray)
    }

    const guildID = config.guildID
    const guild = client.guilds.cache.get(guildID)
    if (guild) {
        await guild.commands.set(commandsArray)
        console.log("✅ Instantly registered guild commands.")
    }

    console.log(table.toString(), "\nKomennot ladattu.")
}

module.exports = { loadCommands }*/
