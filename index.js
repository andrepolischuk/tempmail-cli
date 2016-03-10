import Configstore from 'configstore';
import {bold, gray} from 'chalk';
import meow from 'meow';
import read from 'read-pkg';
import {generateEmail, getInbox} from 'tempmail-wrapper/tempmail';

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
let email = options.get('email');

if (!email || cli.flags.new) {
  generateEmail().then(storeAddress);
} else {
  storeAddress(email);
}

function storeAddress(email) {
  options.set('email', email);

  if (cli.flags.get) {
    getInbox(email).then(processData);
  } else {
    console.log(email);
  }
}

function processData(data) {
  if (data.error) {
    console.log(data.error);
  } else {
    const last = data[data.length - 1];

    console.log(`${bold(last.mail_from)}
${gray(last.mail_subject)}

${last.mail_text}
    `);
  }
}
