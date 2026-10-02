import Path = require('path')
import fs = require('../libs/fsExtra')

import Logger = require('../Logger')
import DailyLog = require('../objects/DailyLog')

import constants = require('../utils/constants')
const { LogLevel } = constants

declare const global: typeof globalThis & { MetadataPath: string; ServerSettings: { loggerDailyLogsToKeep?: number } }

const TAG = '[LogManager]'

// Type-only: keeps import('../managers/LogManager').LogObject (used by objects/DailyLog.js) resolvable after export = LogManager
declare namespace LogManager {
  interface LogObject {
    timestamp: string
    source: string
    message: string
    levelName: string
    level: number
  }
}
type LogObject = LogManager.LogObject

/**
 * @typedef LogObject
 * @property {string} timestamp
 * @property {string} source
 * @property {string} message
 * @property {string} levelName
 * @property {number} level
 */

class LogManager {
  declare DailyLogPath: string
  declare ScanLogPath: string
  declare currentDailyLog: DailyLog | null
  declare dailyLogBuffer: LogObject[]
  declare dailyLogFiles: string[]

  constructor() {
    this.DailyLogPath = Path.posix.join(global.MetadataPath, 'logs', 'daily')
    this.ScanLogPath = Path.posix.join(global.MetadataPath, 'logs', 'scans')

    /** @type {DailyLog} */
    this.currentDailyLog = null

    /** @type {LogObject[]} */
    this.dailyLogBuffer = []

    /** @type {string[]} */
    this.dailyLogFiles = []
  }

  get loggerDailyLogsToKeep(): number {
    return global.ServerSettings.loggerDailyLogsToKeep || 7
  }

  async ensureLogDirs(): Promise<void> {
    try {
      await fs.ensureDir(this.DailyLogPath)
      await fs.ensureDir(this.ScanLogPath)
    } catch (error) {
      console.error(`[LogManager] Failed to create log directories at "${this.DailyLogPath}": ${(error as Error).message}`) // boundary: the untyped libs/fsExtra ensureDir rejects with a Node fs Error; a catch variable is unknown
      throw new Error(`[LogManager] Failed to create log directories at "${this.DailyLogPath}"`, { cause: error })
    }
  }

  /**
   * 1. Ensure log directories exist
   * 2. Load daily log files
   * 3. Remove old daily log files
   * 4. Create/set current daily log file
   */
  async init(): Promise<void> {
    await this.ensureLogDirs()

    // Load daily logs
    await this.scanLogFiles()

    // Check remove extra daily logs
    if (this.dailyLogFiles.length > this.loggerDailyLogsToKeep) {
      const dailyLogFilesCopy = [...this.dailyLogFiles]
      for (let i = 0; i < dailyLogFilesCopy.length - this.loggerDailyLogsToKeep; i++) {
        await this.removeLogFile(dailyLogFilesCopy[i])
      }
    }

    // set current daily log file or create if does not exist
    const currentDailyLogFilename = DailyLog.getCurrentDailyLogFilename()
    Logger.info(TAG, `Init current daily log filename: ${currentDailyLogFilename}`)

    this.currentDailyLog = new DailyLog(this.DailyLogPath)

    if (this.dailyLogFiles.includes(currentDailyLogFilename)) {
      Logger.debug(TAG, `Daily log file already exists - set in Logger`)
      await this.currentDailyLog.loadLogs()
    } else {
      this.dailyLogFiles.push(this.currentDailyLog.filename)
    }

    // Log buffered daily logs
    if (this.dailyLogBuffer.length) {
      this.dailyLogBuffer.forEach((logObj) => {
        this.currentDailyLog!.appendLog(logObj) // set a few lines above in init(); the narrowing does not reach into the callback
      })
      this.dailyLogBuffer = []
    }
  }

  /**
   * Load all daily log filenames in /metadata/logs/daily
   */
  async scanLogFiles(): Promise<void> {
    // libs/fsExtra/fs adds the promisified fs methods in a loop (exports[method] = u(fs[method])), so its inferred type has no readdir
    const dailyFiles = await (fs as typeof fs & { readdir(path: string): Promise<string[]> }).readdir(this.DailyLogPath)
    if (dailyFiles?.length) {
      dailyFiles.forEach((logFile) => {
        if (Path.extname(logFile) === '.txt') {
          Logger.debug('Daily Log file found', logFile)
          this.dailyLogFiles.push(logFile)
        } else {
          Logger.debug(TAG, 'Unknown File in Daily log files dir', logFile)
        }
      })
    }
    this.dailyLogFiles.sort()
  }

  /**
   *
   * @param {string} filename
   */
  async removeLogFile(filename: string): Promise<void> {
    const fullPath = Path.join(this.DailyLogPath, filename)
    const exists = await fs.pathExists(fullPath)
    if (!exists) {
      Logger.error(TAG, 'Invalid log dne ' + fullPath)
      this.dailyLogFiles = this.dailyLogFiles.filter((dlf) => dlf !== filename)
    } else {
      try {
        await (fs as typeof fs & { unlink(path: string): Promise<void> }).unlink(fullPath) // libs/fsExtra adds unlink in a loop, so its inferred type lacks it
        Logger.info(TAG, 'Removed daily log: ' + filename)
        this.dailyLogFiles = this.dailyLogFiles.filter((dlf) => dlf !== filename)
      } catch (error) {
        Logger.error(TAG, 'Failed to unlink log file ' + fullPath)
      }
    }
  }

  /**
   *
   * @param {LogObject} logObj
   */
  async logToFile(logObj: LogObject): Promise<void> {
    // Fatal crashes get logged to a separate file
    if (logObj.level === LogLevel.FATAL) {
      await this.logCrashToFile(logObj)
    }

    // Buffer when logging before daily logs have been initialized
    if (!this.currentDailyLog) {
      this.dailyLogBuffer.push(logObj)
      return
    }

    // Check log rolls to next day
    if (this.currentDailyLog.id !== DailyLog.getCurrentDateString()) {
      this.currentDailyLog = new DailyLog(this.DailyLogPath)
      if (this.dailyLogFiles.length > this.loggerDailyLogsToKeep) {
        // Remove oldest log
        this.removeLogFile(this.dailyLogFiles[0])
      }
    }

    // Append log line to log file
    return this.currentDailyLog.appendLog(logObj)
  }

  /**
   *
   * @param {LogObject} logObj
   */
  async logCrashToFile(logObj: LogObject): Promise<void> {
    const line = JSON.stringify(logObj) + '\n'

    const logsDir = Path.join(global.MetadataPath, 'logs')
    await fs.ensureDir(logsDir)
    const crashLogPath = Path.join(logsDir, 'crash_logs.txt')
    // libs/fsExtra adds writeFile in a loop (exports[method] = u(fs[method])), so its inferred type lacks it
    return (fs as typeof fs & { writeFile(file: string, data: string, options: { flag: string }): Promise<void> }).writeFile(crashLogPath, line, { flag: 'a+' }).catch((error) => {
      console.log('[LogManager] Appended crash log', error)
    })
  }

  /**
   * Most recent 5000 daily logs
   *
   * @returns {string}
   */
  getMostRecentCurrentDailyLogs() {
    return this.currentDailyLog?.logs.slice(-5000) || ''
  }
}
export = LogManager
