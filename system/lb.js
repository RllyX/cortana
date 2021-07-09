const Discord = require('discord.js');
const fs = require('fs');

module.exports = {

    execute(message, client) {

        // Sort raw data
        files = fs.readdirSync(`./data/xp/`).filter(t => t.endsWith('.json'));
        unsorted = [];
        for(let i in files) {
            file = JSON.parse(fs.readFileSync(`./data/xp/${files[i]}`));
            unsorted.push({
                id: files[i].split(".")[0],
                count: file.m,
            });
        };
        leaderboard = unsorted.sort((a, b) => (a.count < b.count) ? 1 : -1);
    
        // Further sort
        raw = [];
        counter = 1
        for(let i in leaderboard) {
            user = client.users.cache.get(leaderboard[i].id);
            username = leaderboard[i].id;
            if(user != null) {
                username = user.tag
            }

            raw.push({
                id: leaderboard[i].id,
                username: username,
                position: counter,
                count: leaderboard[i].count,
            });
            counter = counter + 1;
        }   

        // Format
        pages = [];
        string = [];
        for(let i in raw) {
            temp = `${raw[i].position}) ${raw[i].username} - ${raw[i].count} XP`;
            if(raw[i].position == 1) {
                temp = `🥇 ${raw[i].username} - ${raw[i].count} XP`
            } else if(raw[i].position == 2) {
                temp = `🥈 ${raw[i].username} - ${raw[i].count} XP`
            } else if(raw[i].position == 3) {
                temp = `🥉 ${raw[i].username} - ${raw[i].count} XP`
            }
            if(string.length < 10) {
                string.push(temp);
            } else {
                pages.push("```"+ string.join(` \n`) +"\n```");
                string = [];
                string.push(temp);
            }
        }

        pages = pages.slice(10);

        // Less than 10 users?
        if(pages.length == 0) {
            pages.push("```"+ string.join(` \n`) +"\n```");
        }

        const guilds = pages;
        const generateEmbed = start => {
            const current = guilds.slice(start, start + 1)
            const embed = new Discord.MessageEmbed()
                .setTitle(`Page ${start + 1}/${guilds.length}`)
                .setColor('DARK_BLUE') 
                .setAuthor(`Leaderboard - Top 100`, message.guild.iconURL())
            current.forEach(g => {
                embed.setDescription(g);
            });
            return embed
        };
        message.channel.send(generateEmbed(0)).then(message => {
            if (guilds.length <= 1) return                
            message.react('➡️');
            const collector = message.createReactionCollector((reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name) && !user.bot, {time: 99999});
        
            let currentIndex = 0
            collector.on('collect', reaction => {
                message.reactions.removeAll().then(async () => {
                    reaction.emoji.name === '⬅️' ? currentIndex -= 1 : currentIndex += 1
                    message.edit(generateEmbed(currentIndex));                      
                    if (currentIndex !== 0) await message.react('⬅️');
                    if (currentIndex + 1 < guilds.length) message.react('➡️');
                });
            });
        });
    }
}
