// --> Packages
const Discord = require('discord.js');
const fs = require('fs');
const CronJob = require('cron').CronJob;
const client = require(`./../index.js`);

// --> Commands
module.exports = {
    execute(message, client) {

        // filter
        if(message.author.bot || message.guild == null) return;

        // variables
        md = message.content.split(" ");
        msg = message.content.toLowerCase();

        // commands
        if(msg.startsWith(`${prefix}remember-birthday`)) {

            if(!md[1] || isNaN(md[1].split("-")[0]) || isNaN(md[1].split("-")[1]) || isNaN(md[1].split("-")[2]) || md[1].split("-")[0] < 1 || md[1].split("-")[0] > 12 || md[1].split("-")[1] < 1 || md[1].split("-")[1] > 30 || md[1].split("-")[2] < 1900) {
                embed = new Discord.MessageEmbed()
                    .setColor(`DARK_RED`)
                    .setDescription(`Please include your birthday in the format MM-DD-YYYY.`)
                    .setAuthor(message.author.tag, message.author.displayAvatarURL())
                message.channel.send(embed);
                return
            }

            embed = new Discord.MessageEmbed()
                .setColor('GREEN')
                .setAuthor(message.author.tag, message.author.displayAvatarURL())
                .setDescription(`Set!`)
            message.channel.send(embed);

            fs.writeFileSync(`./data/birthdays/${message.author.id}.json`, JSON.stringify({
                birthday: md[1]
            }, null, 4));
        }
        if(msg.startsWith(`${prefix}forget-birthday`)) {
            try {
                fs.unlinkSync(`./data/birthdays/${message.author.id}.json`);

                embed = new Discord.MessageEmbed()
                    .setColor(`GREEN`)
                    .setDescription(`Your birthday is now forgotten!`)
                    .setAuthor(message.author.tag, message.author.displayAvatarURL())
                message.channel.send(embed);
            } catch(err) {
                embed = new Discord.MessageEmbed()
                    .setColor(`DARK_RED`)
                    .setDescription(`You haven't set your birthday.`)
                    .setAuthor(message.author.tag, message.author.displayAvatarURL())
                message.channel.send(embed);
            }
        }
        if(msg.startsWith(`${prefix}birthday`)) {
            
            id = message.mentions.users.first() ? message.mentions.users.first().id : message.author.id;

            if(fs.existsSync(`./data/birthdays/${id}.json`)) {
                embed = new Discord.MessageEmbed()
                    .setDescription(JSON.parse(fs.readFileSync(`./data/birthdays/${id}.json`)).birthday)
                    .setColor('ORANGE')
                message.channel.send(embed);
            } else {
                embed = new Discord.MessageEmbed()
                    .setDescription(`Birthday has not been set.`)
                    .setColor('ORANGE')
                message.channel.send(embed);
            }
        }
    }
}
