import test from 'ava';
import execa from 'execa';

test('generate a new email address', async t => {
  const {stdout} = await execa('./cli.js');
  t.true(stdout.indexOf('@') > 0);
});

test('get messages', async t => {
  const {stdout} = await execa('./cli.js', ['--get-mail']);
  t.is(stdout, 'There are no emails yet');
});
