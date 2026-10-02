/// <reference path="../types/untypedModules.d.ts" />
import uuid = require('uuid')
const uuidv4 = uuid.v4
import htmlSanitizer = require('../utils/htmlSanitizer')
const { stripAllTags } = htmlSanitizer

/** Stored device info, as written by toJSON() (null fields are left out) */
interface DeviceInfoData {
  [key: string]: string | null | undefined // construct(), toJSON() and update() read, delete and copy fields by a dynamic key
  id?: string | null
  userId?: string | null
  deviceId?: string | null
  ipAddress?: string | null
  browserName?: string | null
  browserVersion?: string | null
  osName?: string | null
  osVersion?: string | null
  deviceType?: string | null
  clientVersion?: string | null
  manufacturer?: string | null
  model?: string | null
  sdkVersion?: string | null
  clientName?: string | null
  deviceName?: string | null
}

/** The parts of a ua-parser-js result that setData() reads */
interface UserAgentInfo {
  browser: { name?: string; version?: string }
  os: { name?: string; version?: string }
  device: { type?: string }
}

/** Device info sent by a client app */
interface ClientDeviceInfo {
  deviceId?: string
  clientVersion?: string
  manufacturer?: string
  model?: string
  sdkVersion?: string | number
  clientName?: string
}

class DeviceInfo {
  [key: string]: unknown // construct() and update() assign fields by a dynamic key
  /** @type {string[]} Fields to sanitize when loading from stored data */
  static stringFields = ['deviceId', 'clientVersion', 'manufacturer', 'model', 'sdkVersion', 'clientName', 'deviceName']
  declare id: string | null
  declare userId: string | null | undefined // setData() is passed req.user?.id
  declare deviceId: string | null
  declare ipAddress: string | null
  declare browserName: string | null
  declare browserVersion: string | null
  declare osName: string | null
  declare osVersion: string | null
  declare deviceType: string | null
  declare clientVersion: string | null
  declare manufacturer: string | null
  declare model: string | null
  declare sdkVersion: string | null
  declare clientName: string | null
  declare deviceName: string | null

  constructor(deviceInfo: DeviceInfoData | null = null) {
    this.id = null
    this.userId = null
    this.deviceId = null
    this.ipAddress = null

    // From User Agent (see: https://www.npmjs.com/package/ua-parser-js)
    this.browserName = null
    this.browserVersion = null
    this.osName = null
    this.osVersion = null
    this.deviceType = null

    // From client
    this.clientVersion = null
    this.manufacturer = null
    this.model = null
    this.sdkVersion = null // Android Only

    this.clientName = null
    this.deviceName = null

    if (deviceInfo) {
      this.construct(deviceInfo)
    }
  }

  construct(deviceInfo: DeviceInfoData): void {
    for (const key in deviceInfo) {
      if (deviceInfo[key] !== undefined && this[key] !== undefined) {
        this[key] = DeviceInfo.stringFields.includes(key) ? stripAllTags(deviceInfo[key]) : deviceInfo[key]
      }
    }
  }

  toJSON(): DeviceInfoData {
    const obj: DeviceInfoData = {
      id: this.id,
      userId: this.userId,
      deviceId: this.deviceId,
      ipAddress: this.ipAddress,
      browserName: this.browserName,
      browserVersion: this.browserVersion,
      osName: this.osName,
      osVersion: this.osVersion,
      deviceType: this.deviceType,
      clientVersion: this.clientVersion,
      manufacturer: this.manufacturer,
      model: this.model,
      sdkVersion: this.sdkVersion,
      clientName: this.clientName,
      deviceName: this.deviceName
    }
    for (const key in obj) {
      if (obj[key] === null || obj[key] === undefined) {
        delete obj[key]
      }
    }
    return obj
  }

  get deviceDescription() {
    if (this.model) {
      // Set from mobile apps
      if (this.sdkVersion) return `${this.model} SDK ${this.sdkVersion} / v${this.clientVersion}`
      return `${this.model} / v${this.clientVersion}`
    }
    return `${this.osName} ${this.osVersion} / ${this.browserName}`
  }

  // When client doesn't send a device id
  getTempDeviceId(): string {
    const keys = [this.userId, this.browserName, this.browserVersion, this.osName, this.osVersion, this.clientVersion, this.manufacturer, this.model, this.sdkVersion, this.ipAddress].map((k) => k || '')
    return 'temp-' + Buffer.from(keys.join('-'), 'utf-8').toString('base64')
  }

  setData(ip: string | null | undefined, ua: UserAgentInfo | null | undefined, clientDeviceInfo: ClientDeviceInfo | null | undefined, serverVersion: string, userId: string | null | undefined): void {
    this.id = uuidv4()
    this.userId = userId
    this.deviceId = clientDeviceInfo?.deviceId || this.id
    this.ipAddress = ip || null

    this.browserName = ua?.browser.name || null
    this.browserVersion = ua?.browser.version || null
    this.osName = ua?.os.name || null
    this.osVersion = ua?.os.version || null
    this.deviceType = ua?.device.type || null

    this.clientVersion = stripAllTags(clientDeviceInfo?.clientVersion) || serverVersion
    this.manufacturer = stripAllTags(clientDeviceInfo?.manufacturer) || null
    this.model = stripAllTags(clientDeviceInfo?.model) || null

    if (typeof clientDeviceInfo?.sdkVersion === 'number') {
      this.sdkVersion = clientDeviceInfo.sdkVersion.toString()
    } else {
      this.sdkVersion = stripAllTags(clientDeviceInfo?.sdkVersion) || null
    }

    this.clientName = stripAllTags(clientDeviceInfo?.clientName) || null
    if (this.sdkVersion) {
      if (!this.clientName) this.clientName = 'Abs Android'
      this.deviceName = `${this.manufacturer || 'Unknown'} ${this.model || ''}`
    } else if (this.model) {
      if (!this.clientName) this.clientName = 'Abs iOS'
      this.deviceName = `${this.manufacturer || 'Unknown'} ${this.model || ''}`
    } else if (this.osName && this.browserName) {
      if (!this.clientName) this.clientName = 'Abs Web'
      this.deviceName = `${this.osName} ${this.osVersion || 'N/A'} ${this.browserName}`
    } else if (!this.clientName) {
      this.clientName = 'Unknown'
    }

    if (!this.deviceId) {
      this.deviceId = this.getTempDeviceId()
    }
  }

  update(deviceInfo: DeviceInfo): boolean {
    const deviceInfoJson = deviceInfo.toJSON ? deviceInfo.toJSON() : deviceInfo
    const existingDeviceInfoJson = this.toJSON()

    let hasUpdates = false
    for (const key in deviceInfoJson) {
      if (['id', 'deviceId'].includes(key)) continue

      if (deviceInfoJson[key] !== existingDeviceInfoJson[key]) {
        this[key] = deviceInfoJson[key]
        hasUpdates = true
      }
    }

    for (const key in existingDeviceInfoJson) {
      if (['id', 'deviceId'].includes(key)) continue

      if (existingDeviceInfoJson[key] && !deviceInfoJson[key]) {
        this[key] = null
        hasUpdates = true
      }
    }

    return hasUpdates
  }
}
export = DeviceInfo
