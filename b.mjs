import { build } from 'vite';
try { await build({ configFile: '/dev-server/vite.electron.config.ts' }); }
catch(e){ console.log('MSG:', e.message); console.log('CODE:', e.code, e.id, e.loc); console.log(e.stack); }
