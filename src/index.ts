import consola from 'consola'
import Cauldron from './Cauldron';

const DEBUG = true;

(async () => {
  consola.wrapAll();

  const cauldron = await Cauldron.init(DEBUG);
  if (!cauldron) throw new Error('Cauldron not initialized');
  consola.success('Cauldron created');


  await cauldron.sql.refreshTableSchema();

  cauldron.info();

  await cauldron.sql.close();
})().catch((err) => {
  console.error('RUNNING CAULDRON FAILED', err)
})
