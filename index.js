import Configstore from 'configstore';
import {dim, red} from 'chalk';
import inquirer from 'inquirer';
import meow from 'meow';
import pager from 'default-pager';
import read from 'read-pkg';
import {Readable} from 'stream';
import TempMail from 'tempmail.js';

process.env.PAGER = process.env.PAGER || 'less';
process.env.LESS  = process.env.LESS  || 'FRX';

const cli = meow(`
    Usage
      tempmail-cli

    Options
      --new  Generate new email
      --get  Get last message

    Examples
      tempmail-cli
      tempmail-cli --get
`);

const pkg = read.sync();
const options = new Configstore(pkg.name);
const account = new TempMail(!cli.flags.new && options.get('email'));
options.set('email', account.address)

if (cli.flags.get) {
  account.getMail().then(listMessages);
} else {
  console.log(account.address);
}

function listMessages(messages) {
  if (messages.error) {
    console.log(red(messages.error));
  } else {
    const choices = messages
      .sort((a, b) => b.mail_timestamp - a.mail_timestamp)
      .map(message => ({
        name: `${message.mail_from} ${dim(message.mail_subject)}`,
        value: message
      }));

    inquirer.prompt([{
      type: 'list',
      name: 'message',
      message: 'Your messages:',
      choices: choices
    }], answer => {
      printMessage(answer.message, messages);
    });
  }
}

function printMessage(message, messages) {
  const stream = new Readable({encoding: 'utf8'});

  stream.push(`${message.mail_from}
${dim(message.mail_subject)}

${message.mail_text}
  `);

  stream.push(null);
  stream.pipe(pager(() => {
    listMessages(messages);
  }));
}
