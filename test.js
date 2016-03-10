import test from 'ava';
import execa from 'execa';
import Promise from 'pinkie-promise';
global.Promise = Promise;

test(async t => {
  const {stdout} = await execa('./cli.js');
  t.true(stdout.indexOf('@') > 0);
});
