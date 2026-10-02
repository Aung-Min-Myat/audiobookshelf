/// <reference path="../types/untypedModules.d.ts" />
import nodemailer = require('nodemailer')
import Database = require('../Database')
import Logger = require("../Logger")
import type { Response } from 'express'

// Only the fields this manager reads (ebookFile is libraryItem.media.ebookFile, device comes from EmailSettings)
interface EbookFileToSend {
  metadata: { filename: string; path: string }
}

interface EreaderDeviceTarget {
  name: string
  email: string
}

class EmailManager {
  constructor() { }

  getTransporter() {
    return nodemailer.createTransport(Database.emailSettings.getTransportObject())
  }

  async sendTest(res: Response): Promise<Response | undefined> {
    Logger.info(`[EmailManager] Sending test email`)
    const transporter = this.getTransporter()

    const success = await transporter.verify().catch((error) => {
      Logger.error(`[EmailManager] Failed to verify SMTP connection config`, error)
      return false
    })

    if (!success) {
      return res.status(400).send('Failed to verify SMTP connection configuration')
    }

    transporter.sendMail({
      from: Database.emailSettings.fromAddress,
      to: Database.emailSettings.testAddress || Database.emailSettings.fromAddress,
      subject: 'Test email from Audiobookshelf',
      text: 'Success!'
    }).then((result) => {
      Logger.info(`[EmailManager] Test email sent successfully`, result)
      res.sendStatus(200)
    }).catch((error) => {
      Logger.error(`[EmailManager] Failed to send test email`, error)
      res.status(400).send(error.message || 'Failed to send test email')
    })
  }

  async sendEBookToDevice(ebookFile: EbookFileToSend, device: EreaderDeviceTarget, res: Response): Promise<Response | undefined> {
    Logger.info(`[EmailManager] Sending ebook "${ebookFile.metadata.filename}" to device "${device.name}"/"${device.email}"`)
    const transporter = this.getTransporter()

    const success = await transporter.verify().catch((error) => {
      Logger.error(`[EmailManager] Failed to verify SMTP connection config`, error)
      return false
    })

    if (!success) {
      return res.status(400).send('Failed to verify SMTP connection configuration')
    }

    transporter.sendMail({
      from: Database.emailSettings.fromAddress,
      to: device.email,
      subject: "Here is your Ebook!",
      html: '<div dir="auto"></div>',
      attachments: [
        {
          filename: ebookFile.metadata.filename,
          path: ebookFile.metadata.path,
        }
      ]
    }).then((result) => {
      Logger.info(`[EmailManager] Ebook sent to device successfully`, result)
      res.sendStatus(200)
    }).catch((error) => {
      Logger.error(`[EmailManager] Failed to send ebook to device`, error)
      res.status(400).send(error.message || 'Failed to send ebook to device')
    })
  }
}
export = EmailManager
