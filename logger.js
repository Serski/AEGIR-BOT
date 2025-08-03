const levels = ['error', 'warn', 'info', 'debug'];
const currentLevel = process.env.LOG_LEVEL || 'info';

function shouldLog(level) {
  return levels.indexOf(level) <= levels.indexOf(currentLevel);
}

module.exports = {
  error: (...args) => console.error(...args),
  warn: (...args) => {
    if (shouldLog('warn')) console.warn(...args);
  },
  info: (...args) => {
    if (shouldLog('info')) console.log(...args);
  },
  debug: (...args) => {
    if (shouldLog('debug')) console.debug(...args);
  }
};
