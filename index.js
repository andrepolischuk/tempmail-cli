import Configstore from 'configstore';
import {bold, gray, red} from 'chalk';
import meow from 'meow';
import read from 'read-pkg';
import TempMail from 'tempmail.js';

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
  account.getMail().then(processData);
} else {
  console.log(bold(account.address));
}

function processData(data) {
  if (data.error) {
    console.log(red(data.error));
  } else {
    const last = data[data.length - 1];

    console.log(`${bold(last.mail_from)}
${gray(last.mail_subject)}

${last.mail_text}
    `);
  }
}
