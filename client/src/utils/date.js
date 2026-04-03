const DEFAULT_TIMEZONE = 'America/Los_Angeles';

// Get today's date as YYYY-MM-DD in the given timezone
export function getLocalDate(timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || DEFAULT_TIMEZONE }).format(new Date());
}

// Format a YYYY-MM-DD date string for display in the given timezone
export function formatDate(dateStr, timezone) {
  const date = new Date(dateStr + 'T12:00:00Z');
  return date.toLocaleDateString('en-US', { timeZone: timezone || DEFAULT_TIMEZONE });
}
