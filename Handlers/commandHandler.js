const { loadFiles } = require("../Functions/fileLoader")
const ascii = require("ascii-table")
const config = require("../config.json") // jos haluat guild-komennot

async function loadCommands(client) {
    const table = new ascii().setHeading("Komennot", "Status")

    // Tyhjennä vanhat komennot client.commandsista
    await client.commands.clear()

    let commandsArray = []
    const Files = await loadFiles("Commands")

    for (const file of Files) {
        const command = require(file)

        // Jos komento on jo ladattu, ohitetaan
        if (client.commands.has(command.data.name)) {
            console.warn(`Komento ${command.data.name} ohitettu, koska se on jo ladattu.`)
            continue
        }

        client.commands.set(command.data.name, command)
        commandsArray.push(command.data.toJSON())
        table.addRow(command.data.name, "🟩")
    }

    // Rekisteröi global komennot (voivat myös olla guild-komentoja)
    if (client.application) {
        await client.application.commands.set(commandsArray)
    }

    // (Valinnainen) Jos käytät kehitysguildia
    if (config.guildID) {
        const guild = client.guilds.cache.get(config.guildID)
        if (guild) {
            await guild.commands.set(commandsArray)
            console.log("✅ Guild-komennot rekisteröity!")
        }
    }

    console.log(table.toString(), "\nKomennot ladattu.")
}

module.exports = { loadCommands }
