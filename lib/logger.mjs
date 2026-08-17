function write(level, event, data = {}) {
  const payload = { timestamp: new Date().toISOString(), level, event, ...data };
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else console.log(line);
}

export function createLogger() {
  return {
    info(event, data) { write('info', event, data); },
    warn(event, data) { write('warn', event, data); },
    error(event, data) { write('error', event, data); },
  };
}
