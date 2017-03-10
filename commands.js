// natives
const path = require('path')

// packages
const moment = require('moment')
const jsonfile = require('jsonfile')

// ours
const db = require('./db.js')
const {shouldWorkUntil, printSingleDayReport} = require('./utils/helpers.js')

// constants
const TODAY = moment().format('YYYY-MM-DD')
const CONFIG_FILE = path.join(__dirname, 'config.json')
const CONFIG = jsonfile.readFileSync(CONFIG_FILE)

const setStart = (args, options, logger) => {
  const start = args.start || moment().format('HH:mm')
  logger.info('\n Your start of the day registered as ', start)

  shouldWorkUntil(start, logger, CONFIG)

  const payload = {
    date: TODAY,
    start,
    breakDuration: CONFIG.BREAK_DEFAULT,
    action: 'setStart'
  }

  // update database
  db.updateDatabase(payload)
    .catch((err) => { logger.error(err) })
    .finally(() => { process.exit(0) })

  logger.info('\n TIP: next time you run moro the end of your day will be set')
}

// set total duration of break for today
const setBreak = (args, options, logger, CONFIG) => {
  const duration = args.duration || CONFIG.BREAK_DEFAULT
  logger.info('Break took: ', duration, 'Minutes', ' And will be removed from your work hours')

  const payload = {
    date: TODAY,
    breakDuration: duration,
    action: 'setBreakDuration'
  }
  db.updateDatabase(payload)
    .catch((err) => { logger.error(err) })
    .then(() => { report() })
}

// report functionality for both single and batch reporting
const report = (args, options, logger = console.log, date = TODAY) => {
  if (options && options.all) {
    db
      .getFullReport()
      .catch((error) => { console.log(error) })
      .finally(() => { process.exit(0) })

    return
  }
  db
    .calculateWorkHours(date)
    .then((result) => {
      db.getDateReport(TODAY)
        .then((data) => {
          if (data && result) {
            data.dayReport = result.formattedWorkHours
            const table = printSingleDayReport(data)
            console.log('\n Today looks like this:\n')
            // renders the table
            console.log(table)
            console.log('Run moro --help if you need to edit your start, end or break duration for today \n')
            process.exit(0)
          }
        })
        .catch((err) => { logger.error(err) })
    })
    .catch((err) => { logger.error(err) })
}
const setConfig = (args, options, logger, CONFIG) => {
  if (options.day) {
    CONFIG.HOURS_IN_A_WORK_DAY = options.day
  }

  if (options.break) {
    CONFIG.BREAK_DEFAULT = options.break
  }
  jsonfile.writeFileSync(CONFIG_FILE, CONFIG)
  process.exit(0)
}
// set end of the work day
const setEnd = (args, options, logger, CONFIG) => {
  const end = args.end || moment().format('HH:mm')
  logger.info('Your end of the day registered as: ', end)

  const payload = {
    date: TODAY,
    end,
    action: 'setEnd'
  }
  db
    .updateDatabase(payload)
    .then(() => { report() })
}

const clearData = (args, options, logger) => {
  if (options && options.yes) {
    db.removeDatabase()
    return
  }
  logger.info('If you surely want to clear all data in moro run: moro clear --yes')
  process.exit()
}

const addNote = (args, options, logger) => {
  let note = args.note || '...'
  note = note.join(' ')
  const createdat = moment().format('HH:mm')
  const payload = {
    date: TODAY,
    note,
    createdat,
    action: 'addNote'
  }
  db.updateDatabase(payload)
    .catch((err) => { logger.error(err) })
    .finally(() => {
      console.log('Your note is added. Run moro to see the report')
      process.exit(0)
    })
}

module.exports = {
  setConfig,
  setEnd,
  setStart,
  setBreak,
  addNote,
  report,
  clearData
}
