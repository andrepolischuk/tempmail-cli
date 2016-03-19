import {cursorPrevLine, eraseLine} from 'ansi-escapes';
import Configstore from 'configstore';
import {dim, red} from 'chalk';
import inquirer from 'inquirer';
import meow from 'meow';
import pager from 'default-pager';
import {Readable} from 'stream';
import TempMail from 'tempmail.js';
import {sync as copy} from 'to-clipboard';

process.env.PAGER = process.env.PAGER || 'less';
process.env.LESS  = process.env.LESS  || 'FRX';

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

const options = new Configstore(cli.pkg.name);
const account = new TempMail(!cli.flags.create && options.get('email'));
options.set('email', account.address)

if (cli.flags.getMail) {
  exitByQ();
  account.getMail().then(listMessages);
} else if (cli.flags.deleteAll) {
  account.getMail().then(deleteAllMessages);
} else {
  printAddress(account.address);
}

function listMessages(messages) {
  if (messages.error) {
    console.log(red(messages.error));
  } else {
    inquirer.prompt([{
      type: 'list',
      name: 'message',
      message: 'Your messages:',
      choices: generateChoices(messages)
    }], answer => {
      printMessage(answer.message, messages);
    });
  }
}

function generateChoices(messages) {
  return messages
    .sort((a, b) => b.mail_timestamp - a.mail_timestamp)
    .map(message => ({
      name: `${message.mail_from} ${dim(message.mail_subject)}`,
      value: message
    }));
}

function printMessage(message, messages) {
  const stream = new Readable({encoding: 'utf8'});

  stream.push(`${message.mail_from}
${dim(message.mail_subject)}

${message.mail_text}
  `);

  stream.push(null);
  stream.pipe(pager(() => {
    cleanupOutput();
    listMessages(messages);
  }));
}

function exitByQ() {
  process.stdin.on('keypress', (ch, key = {}) => {
    if (key.name === 'q') process.exit();
  });
}

function cleanupOutput() {
  process.stdout.write(cursorPrevLine + eraseLine);
}

function printAddress(address) {
  try {
    copy(address);
    console.log(`${address} ${dim('(copied to clipboard)')}`);
  } catch (err) {
    console.log(address)
  }
}

function deleteAllMessages(messages) {
  if (messages.error) {
    console.log(red(messages.error));
  } else {
    deleteMessagesSerially(...messages);
  }
}

function deleteMessagesSerially(message, ...messages) {
  if (!message) {
    console.log('All messages have been deleted');
  } else {
    account.deleteMessage(message.mail_id).then(() => {
      setTimeout(() => {
        deleteMessagesSerially(...messages);
      }, 1000);
    });
  }
}
