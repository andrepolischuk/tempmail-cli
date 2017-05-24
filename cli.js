#!/usr/bin/env node
/* eslint-disable strict, no-console */
'use strict';
const meow = require('meow');
const dim = require('chalk').dim;
const inquirer = require('inquirer');
const Readable = require('stream').Readable;
const pager = require('default-pager');
const TempMail = require('tempmail.js');
const Configstore = require('configstore');
const copy = require('to-clipboard').sync;
const ansi = require('ansi-escapes');


process.env.PAGER = process.env.PAGER || 'less';
process.env.LESS = process.env.LESS || 'FRX';

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
});

function getMessages(account, fn) {
  account.getMail().then(messages => {
    if (messages.error) {
      console.log(messages.error);
    } else {
      fn(...messages);
    }
  });
}

function cleanupOutput() {
  process.stdout.write(ansi.cursorPrevLine + ansi.eraseLine);
}

function printMessage(message, messages) {
  const stream = new Readable({ encoding: 'utf8' });

  stream.push(`${message.mail_from}
${dim(message.mail_subject)}

${message.mail_text}
  `);

  stream.push(null);
  stream.pipe(pager(() => {
    cleanupOutput();
    /* eslint-disable no-use-before-define */
    listMessages(...messages);
  }));
}

function generateChoices(messages) {
  return messages
    .sort((a, b) => b.mail_timestamp - a.mail_timestamp)
    .map(message => ({
      name: `${message.mail_from} ${dim(message.mail_subject)}`,
      value: message
    }));
}

function listMessages(...messages) {
  inquirer.prompt([ {
    type: 'list',
    name: 'message',
    message: 'Your messages:',
    choices: generateChoices(messages)
  } ]).then(answer => {
    printMessage(answer.message, messages);
  });
}

function deleteMessages(account, message, ...messages) {
  if (!message) {
    console.log('All messages have been deleted');
  } else {
    account.deleteMessage(message.mail_id).then(() =>
      setTimeout(() => deleteMessages(...messages), 1000)
    );
  }
}

function printAddress(address) {
  try {
    copy(address);
    console.log(`${address} ${dim('(copied to clipboard)')}`);
  } catch (err) {
    console.log(address);
  }
}

function exitByQ() {
  process.stdin.on('keypress', (ch, key = {}) => {
    if (key.name === 'q') process.exit();
  });
}

const options = new Configstore(cli.pkg.name);
const account = new TempMail();
const storedAddress = !cli.flags.create && options.get('email');

account.create(storedAddress).then(() => {
  options.set('email', account.address);

  if (cli.flags.getMail) {
    exitByQ();
    getMessages(account, listMessages);
  } else if (cli.flags.deleteAll) {
    getMessages(account, deleteMessages.bind(null, account));
  } else {
    printAddress(account.address);
  }
});
