const { SlashCommandBuilder } = require('@discordjs/builders');
const motorcycleData = require('../data/bikenode');
const motorcycleUtils = require('../data/bikenode/motorcycleUtils');
const { isValidCategory, VALID_CATEGORIES } = require('../data/bikenode/schema');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('motorcycle')
    .setDescription('Search for motorcycle information')
    .addSubcommand(subcommand =>
      subcommand
        .setName('search')
        .setDescription('Search for motorcycles by criteria')
        .addIntegerOption(option => 
          option.setName('year')
            .setDescription('Year of the motorcycle')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('make')
            .setDescription('Manufacturer of the motorcycle')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('model')
            .setDescription('Model of the motorcycle')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('category')
            .setDescription('Category of the motorcycle')
            .setRequired(false)
            .addChoices(
              ...VALID_CATEGORIES.map(cat => ({ name: cat, value: cat }))
            ))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('similar')
        .setDescription('Find motorcycles with similar engine displacement')
        .addIntegerOption(option =>
          option.setName('displacement')
            .setDescription('Engine displacement in cc')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('tolerance')
            .setDescription('Tolerance in cc')
            .setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('Get motorcycle statistics')
    ),
    
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'search') {
      await handleSearch(interaction);
    } else if (subcommand === 'similar') {
      await handleSimilar(interaction);
    } else if (subcommand === 'stats') {
      await handleStats(interaction);
    }
  },
};

async function handleSearch(interaction) {
  const year = interaction.options.getInteger('year');
  const make = interaction.options.getString('make');
  const model = interaction.options.getString('model');
  const category = interaction.options.getString('category');
  
  const criteria = {};
  if (year) criteria.year = year;
  if (make) criteria.make = make;
  if (model) criteria.model = model;
  if (category) criteria.category = category;
  
  const results = motorcycleData.searchMotorcycles(criteria);
  
  if (results.length === 0) {
    await interaction.reply('No motorcycles found matching your criteria.');
    return;
  }
  
  if (results.length > 10) {
    await interaction.reply(`Found ${results.length} motorcycles. Here are the first 10:`);
    
    let response = '';
    for (let i = 0; i < 10; i++) {
      response += motorcycleUtils.formatMotorcycleForDiscord(results[i]) + '\n\n';
    }
    
    await interaction.followUp(response);
  } else {
    let response = `Found ${results.length} motorcycles:\n\n`;
    
    results.forEach(motorcycle => {
      response += motorcycleUtils.formatMotorcycleForDiscord(motorcycle) + '\n\n';
    });
    
    await interaction.reply(response);
  }
}

async function handleSimilar(interaction) {
  const displacement = interaction.options.getInteger('displacement');
  const tolerance = interaction.options.getInteger('tolerance') || 50;
  
  const results = motorcycleUtils.findSimilarEngineSize(displacement, tolerance);
  
  if (results.length === 0) {
    await interaction.reply(`No motorcycles found with engine displacement around ${displacement}cc (±${tolerance}cc).`);
    return;
  }
  
  if (results.length > 10) {
    await interaction.reply(`Found ${results.length} motorcycles with engine displacement around ${displacement}cc (±${tolerance}cc). Here are the first 10:`);
    
    let response = '';
    for (let i = 0; i < 10; i++) {
      response += motorcycleUtils.formatMotorcycleForDiscord(results[i]) + '\n\n';
    }
    
    await interaction.followUp(response);
  } else {
    let response = `Found ${results.length} motorcycles with engine displacement around ${displacement}cc (±${tolerance}cc):\n\n`;
    
    results.forEach(motorcycle => {
      response += motorcycleUtils.formatMotorcycleForDiscord(motorcycle) + '\n\n';
    });
    
    await interaction.reply(response);
  }
}

async function handleStats(interaction) {
  const years = motorcycleData.getYears();
  const categories = motorcycleUtils.getAllCategories();
  const decadeStats = motorcycleUtils.getDecadeStats();
  
  let response = '**Motorcycle Database Statistics**\n\n';
  
  response += `Years covered: ${Math.min(...years)} - ${Math.max(...years)}\n\n`;
  
  response += '**Motorcycles per decade:**\n';
  Object.keys(decadeStats).sort().forEach(decade => {
    response += `${decade}s: ${decadeStats[decade]} models\n`;
  });
  
  response += '\n**Available categories:**\n';
  response += categories.join(', ');
  
  await interaction.reply(response);
}
