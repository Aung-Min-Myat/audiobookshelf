/// <reference path="../types/untypedModules.d.ts" />
import uuid = require('uuid')
import Logger = require('../Logger')
const uuidv4 = uuid.v4

interface ScanLog {
  timestamp: string
  message: string
  levelName: string
  level: number
}

class ScanLogger {
  declare id: string | null
  declare type: string | null
  declare name: string | null
  declare verbose: boolean

  declare startedAt: number | null
  declare finishedAt: number | null
  declare elapsed: number | null

  declare authorsRemovedFromBooks: string[]
  declare authorsNumBooksChangedIds: Set<string>
  declare seriesRemovedFromBooks: string[]

  declare logs: ScanLog[]

  constructor() {
    this.id = null
    this.type = null
    this.name = null
    this.verbose = false

    this.startedAt = null
    this.finishedAt = null
    this.elapsed = null

    /** @type {string[]} */
    this.authorsRemovedFromBooks = []
    /** @type {Set<string>} */
    this.authorsNumBooksChangedIds = new Set()
    /** @type {string[]} */
    this.seriesRemovedFromBooks = []

    this.logs = []
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      elapsed: this.elapsed
    }
  }

  setData(type: string, name: string): void {
    this.id = uuidv4()
    this.type = type
    this.name = name
    this.startedAt = Date.now()
  }

  setComplete(): void {
    this.finishedAt = Date.now()
    this.elapsed = this.finishedAt - this.startedAt! // startedAt is set by setData() before setComplete() runs
  }

  addLog(level: number, ...args: unknown[]): void {
    const logObj: ScanLog = {
      timestamp: new Date().toISOString(),
      message: args.join(' '),
      levelName: Logger.getLogLevelString(level),
      level
    }

    if (this.verbose) {
      Logger.debug(`[Scan] "${this.name}":`, ...args)
    }
    this.logs.push(logObj)
  }
}
export = ScanLogger
