// Calendar-based delivery avoids shifting an hour when US daylight saving changes.
export function dailyDue(lastSent, now = Date.now(), time = '08:00', timeZone = 'America/New_York') {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('DELIVERY_TIME must be HH:mm.');
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' });
  const parts = value => Object.fromEntries(formatter.formatToParts(new Date(value)).map(p => [p.type,p.value]));
  const current = parts(now), [hour,minute] = time.split(':').map(Number);
  const elapsed = Number(current.hour) * 60 + Number(current.minute) - (hour * 60 + minute);
  // Retry transient failures for one hour. Do not send an unexpected afternoon catch-up.
  if (elapsed < 0 || elapsed >= 60) return false;
  if (!lastSent) return true;
  const previous = parts(lastSent);
  return `${current.year}-${current.month}-${current.day}` !== `${previous.year}-${previous.month}-${previous.day}`;
}
