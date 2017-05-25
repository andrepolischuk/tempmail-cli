#!/usr/bin/env node
/* eslint-disable no-console */
'use strict'
const meow = require('meow')
const delay = require('delay')
const dim = require('chalk').dim
const inquirer = require('inquirer')
const Readable = require('stream').Readable
const pager = require('default-pager')
const TempMail = require('tempmail.js')
const Configstore = require('configstore')
const copy = require('to-clipboard').sync
const ansi = require('ansi-escapes')

process.env.PAGER = process.env.PAGER || 'less'
process.env.LESS = process.env.LESS || 'FRX'

const cli = meow(`
    Usage
      tempmail

    Options
      --create, -c      Generate a new email address
      --get-mail, -g    Get messages
      --delete-all, -D  Delete all messages

    Examples
      tempmail
      tempmail --get-mail
`, {
  alias: {
    c: 'create',
    g: 'get-mail',
    D: 'delete-all'
  }
})

function printMessage (message) {
  return new Promise(resolve => {
    const stream = new Readable({
      encoding: 'utf8'
    })

    stream.push(`${message.mail_from}\n${dim(message.mail_subject)}\n\n${message.mail_text}`)
    stream.push(null)

    stream.pipe(pager(() => {
      process.stdout.write(ansi.cursorPrevLine + ansi.eraseLine)
      resolve()
    }))
  })
}

function generateChoices (messages) {
  return messages
    .sort((a, b) => b.mail_timestamp - a.mail_timestamp)
    .map(message => ({
      name: `${message.mail_from} ${dim(message.mail_subject)}`,
      value: message
    }))
}

function listMessages (messages) {
  return inquirer
    .prompt([{
      type: 'list',
      name: 'message',
      message: 'Your messages:',
      choices: generateChoices(messages)
    }])
    .then(answer => printMessage(answer.message))
    .then(() => listMessages(messages))
}

function getMail (account) {
  return account.getMail().then(messages => {
    if (messages.error) {
      throw new Error(messages.error)
    }

    return messages
  })
}

function viewMail (account) {
  process.stdin.on('keypress', (ch, key) => {
    if (key && key.name === 'q') process.exit()
  })

  return getMail(account)
    .then(listMessages)
    .catch(err => {
      console.log(err.message)
    })
}

function deleteMessages (account, messages) {
  if (messages.length === 0) {
    return
  }

  return account.deleteMessage(messages[0].mail_id)
    .then(delay(1000))
    .then(() => deleteMessages(account, messages.filter((m, i) => i > 0)))
}

function cleanupMail (account) {
  return getMail(account)
    .then(messages => deleteMessages(account, messages))
    .then(() => {
      console.log('All messages have been deleted')
    })
    .catch(err => {
      console.log(err.messages)
    })
}

function printAddress (address) {
  try {
    copy(address)
    console.log(`${address} ${dim('(copied to clipboard)')}`)
  } catch (err) {
    console.log(address)
  }
}

const options = new Configstore(cli.pkg.name)
const account = new TempMail()
const storedAddress = !cli.flags.create && options.get('email')

account.create(storedAddress).then(() => {
  options.set('email', account.address)

  if (cli.flags.getMail) {
    viewMail(account)
  } else if (cli.flags.deleteAll) {
    cleanupMail(account)
  } else {
    printAddress(account.address)
  }
})
