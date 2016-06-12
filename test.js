import test from 'ava';
import execa from 'execa';

let out;

test('generate a first email address', async t => {
  const { stdout } = await execa('./cli.js');
  out = stdout;
  t.true(stdout.indexOf('@') > 0);
});

test('return a stored email address', async t => {
  const { stdout } = await execa('./cli.js');
  t.true(stdout.indexOf('@') > 0);
  t.is(stdout, out);
});

test('re-generate a new email address', async t => {
  const { stdout } = await execa('./cli.js', [ '--create' ]);
  t.true(stdout.indexOf('@') > 0);
  t.not(stdout, out);
});

test('get messages', async t => {
  const { stdout } = await execa('./cli.js', [ '--get-mail' ]);
  t.is(stdout, 'There are no emails yet');
});
