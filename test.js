import test from 'ava';
import execa from 'execa';

test(async t => {
  const {stdout} = await execa('./cli.js');
  t.true(stdout.indexOf('@') > 0);
});
