/**
 * @typedef MigrationContext
 * @property {import('sequelize').QueryInterface} queryInterface - a Sequelize QueryInterface object.
 * @property {import('../Logger')} logger - a Logger object.
 *
 * @typedef MigrationOptions
 * @property {MigrationContext} context - an object containing the migration context.
 */

const Database = require('../Database')

const migrationVersion = '2.37.0'
const migrationName = `${migrationVersion}-backfill-library-item-counts`
const loggerPrefix = `[${migrationVersion} migration]`

/**
 * This migration script adds an itemCount column to the libraries table and
 * backfills it from the current number of library items in each library.
 *
 * @param {MigrationOptions} options - an object containing the migration context.
 * @returns {Promise<void>} - A promise that resolves when the migration is complete.
 */
async function up({ context: { queryInterface, logger } }) {
  logger.info(`${loggerPrefix} UPGRADE BEGIN: ${migrationName}`)

  if (await queryInterface.tableExists('libraries')) {
    const tableDescription = await queryInterface.describeTable('libraries')

    if (!tableDescription.itemCount) {
      logger.info(`${loggerPrefix} Adding itemCount column to libraries table`)
      await queryInterface.addColumn('libraries', 'itemCount', {
        type: queryInterface.sequelize.Sequelize.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      })

      const libraries = await Database.libraryModel.findAll({ attributes: ['id'] })
      for (const library of libraries) {
        const itemCount = await Database.libraryItemModel.count({ where: { libraryId: library.id } })
        await queryInterface.bulkUpdate('libraries', { itemCount }, { id: library.id })
      }
      logger.info(`${loggerPrefix} Backfilled itemCount for ${libraries.length} libraries`)
    } else {
      logger.info(`${loggerPrefix} itemCount column already exists in libraries table`)
    }
  } else {
    logger.info(`${loggerPrefix} libraries table does not exist`)
  }

  logger.info(`${loggerPrefix} UPGRADE END: ${migrationName}`)
}

/**
 * This migration script removes the itemCount column from the libraries table.
 *
 * @param {MigrationOptions} options - an object containing the migration context.
 * @returns {Promise<void>} - A promise that resolves when the migration is complete.
 */
async function down({ context: { queryInterface, logger } }) {
  logger.info(`${loggerPrefix} DOWNGRADE BEGIN: ${migrationName}`)

  if (await queryInterface.tableExists('libraries')) {
    const tableDescription = await queryInterface.describeTable('libraries')

    if (tableDescription.itemCount) {
      logger.info(`${loggerPrefix} Removing itemCount column from libraries table`)
      await queryInterface.removeColumn('libraries', 'itemCount')
    } else {
      logger.info(`${loggerPrefix} itemCount column does not exist in libraries table`)
    }
  } else {
    logger.info(`${loggerPrefix} libraries table does not exist`)
  }

  logger.info(`${loggerPrefix} DOWNGRADE END: ${migrationName}`)
}

module.exports = { up, down }
