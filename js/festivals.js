// Festivals the town dresses up for, by the date in Bangkok. Dates are month-day, both ends included.
// ?festival=halloween previews one on any day; ?festival=none turns them off.

export const FESTIVALS = [{ id: 'halloween', from: '10-24', to: '10-31' }];

export function festivalNow(params, date = new Date()) {
  const forced = params.get('festival');
  if (forced) return FESTIVALS.some((f) => f.id === forced) ? forced : null;
  // en-CA writes month and day as "10-31"
  const md = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', month: '2-digit', day: '2-digit' }).format(date);
  return FESTIVALS.find((f) => md >= f.from && md <= f.to)?.id ?? null;
}
