/**
 * @jest-environment node
 */
// Node environment: cheerio's undici dependency needs web-stream globals that
// CRA's jsdom environment lacks (the same reason App.test.tsx cannot load).
import fs from 'fs';
import path from 'path';
import { flightDates, flightSlug } from './flightAsset';
import { applyFilters, inDepartWindow, timeToMin } from './filter_helpers';

// Jest 27 hides Node's web globals; cheerio's undici dependency needs them at load.
/* eslint-disable @typescript-eslint/no-var-requires */
const web = require('stream/web');
const workers = require('worker_threads');
const { Blob, File, atob } = require('buffer');
const DOMException = (() => { try { atob('~'); } catch (e) { return (e as Error).constructor; } return Error; })();
Object.assign(global, {
	ReadableStream: web.ReadableStream, WritableStream: web.WritableStream, TransformStream: web.TransformStream,
	MessagePort: workers.MessagePort, MessageChannel: workers.MessageChannel, Blob, File, DOMException,
});
const { parseFlights } = require('./htmlSnippetFlight');
/* eslint-enable @typescript-eslint/no-var-requires */

const read = (f: string) => fs.readFileSync(path.join(__dirname, '../../public/scraped_data', f), 'utf8');

test.each([
	['flight_ORDLAX_results.txt', 29],
	['flight_NYCSIN_results.txt', 23],
])('%s: duplicates dropped, flight numbers and slugs unique, cities set', (file, count) => {
	const flights = parseFlights(read(file));
	expect(flights).toHaveLength(count);
	expect(new Set(flights.map((f: any) => f.flightNumber)).size).toBe(count);
	expect(new Set(flights.map(flightSlug)).size).toBe(count);
	for (const f of flights) {
		expect(f.flightNumber).toMatch(/^[A-Z0-9]{2} \d{3,4}$/);
		expect(f.departureCity).not.toBe('');
		expect(f.arrivalCity).not.toBe('');
		expect(f.arrivalTime).not.toMatch(/\+/);
	}
});

test('arrival day offsets come from the itinerary labels', () => {
	const ord = parseFlights(read('flight_ORDLAX_results.txt'));
	const overnight = ord.find((f: any) => f.departure === 'MDW' && f.departureTime === '5:15 PM');
	expect(overnight.arrivalTime).toBe('12:13 PM');
	expect(overnight.arrivalDayOffset).toBe(1);
	expect(ord.find((f: any) => f.departure === 'ORD' && f.departureTime === '5:10 AM').arrivalDayOffset).toBe(0);
	expect(ord.find((f: any) => f.departureTime === '12:54 PM' && f.airline === 'Spirit').arrivalDayOffset).toBe(0);
	const sin = parseFlights(read('flight_NYCSIN_results.txt'));
	expect(sin.find((f: any) => f.departure === 'EWR' && f.departureTime === '5:50 PM').arrivalDayOffset).toBe(2);
	expect(sin.every((f: any) => f.arrivalDayOffset >= 1)).toBe(true);
});

test('dates follow the chosen departure date, across month and year ends', () => {
	expect(flightDates({ arrivalDayOffset: 0 }, '2026-12-10')).toEqual({ departureDate: '2026-12-10', arrivalDate: '2026-12-10' });
	expect(flightDates({ arrivalDayOffset: 1 }, '2026-12-31')).toEqual({ departureDate: '2026-12-31', arrivalDate: '2027-01-01' });
	expect(flightDates({ arrivalDayOffset: 2 }, '2026-11-30')).toEqual({ departureDate: '2026-11-30', arrivalDate: '2026-12-02' });
	expect(flightDates({ arrivalDayOffset: 0 }, '')).toBeNull();
});

test('the mock overnight O\'Hare flight departs 10:45 PM and arrives 1:00 AM the next day', () => {
	const ord = parseFlights(read('flight_ORDLAX_results.txt'));
	const overnight = ord.filter((f: any) => f.departure === 'ORD' && f.arrivalDayOffset === 1);
	expect(overnight).toHaveLength(1);
	expect(overnight[0]).toMatchObject({
		airline: 'Prairie Air', airlineLogo: 'P9', departure: 'ORD', arrival: 'LAX', departureCity: 'Chicago', arrivalCity: 'Los Angeles',
		departureTime: '10:45 PM', arrivalTime: '1:00 AM', duration: '4 hr 15 min', stops: 0, price: 239, arrivalDayOffset: 1,
	});
	expect(overnight[0].flightNumber).toMatch(/^P9 \d{3,4}$/);
	expect(flightDates(overnight[0], '2026-12-10')).toEqual({ departureDate: '2026-12-10', arrivalDate: '2026-12-11' });
	// Only one Prairie Air flight, and it is the only new one.
	expect(ord.filter((f: any) => f.airline === 'Prairie Air')).toHaveLength(1);
});

test('departure times honour AM and PM', () => {
	expect(timeToMin('5:15 AM')).toBe(315);
	expect(timeToMin('5:15 PM')).toBe(1035);
	expect(timeToMin('5:15\u202fPM')).toBe(1035);
	expect(timeToMin('12:05 AM')).toBe(5);
	expect(timeToMin('12:54 PM')).toBe(774);
	expect(timeToMin('10:45 PM')).toBe(1365);
	expect(timeToMin('11:59 PM')).toBe(1439);
	expect(timeToMin('17:15')).toBe(1035);
	expect(inDepartWindow(timeToMin('11:30 PM'), 0, 23)).toBe(true);
	expect(inDepartWindow(timeToMin('5:15 AM'), 12, 23)).toBe(false);
	expect(inDepartWindow(timeToMin('5:15 PM'), 12, 23)).toBe(true);
	expect(inDepartWindow(timeToMin('5:15 PM'), 0, 11)).toBe(false);
	expect(inDepartWindow(timeToMin('10:45 PM'), 22, 5)).toBe(true);
	expect(inDepartWindow(timeToMin('1:30 AM'), 22, 5)).toBe(true);
	expect(inDepartWindow(timeToMin('7:00 AM'), 22, 5)).toBe(false);
});

test('the departure-time filter separates morning, evening and late-night flights in the data', () => {
	const ord = parseFlights(read('flight_ORDLAX_results.txt'));
	const base = { stops: [], airlines: [], bagsIncluded: false, priceMax: 2000, departStart: 0, departEnd: 23, lowEmissionsOnly: false, connectingAirports: [], durationMaxHrs: 40 };
	expect(ord.filter((f: any) => applyFilters(f, base as any))).toHaveLength(ord.length);
	const evening = ord.filter((f: any) => applyFilters(f, { ...base, departStart: 18, departEnd: 23 } as any));
	expect(evening.length).toBeGreaterThan(0);
	expect(evening.every((f: any) => / PM$/.test(f.departureTime) && timeToMin(f.departureTime) >= 18 * 60)).toBe(true);
	expect(evening.some((f: any) => f.airline === 'Prairie Air')).toBe(true);
	const morning = ord.filter((f: any) => applyFilters(f, { ...base, departStart: 0, departEnd: 11 } as any));
	expect(morning.every((f: any) => / AM$/.test(f.departureTime))).toBe(true);
	expect(morning.length + ord.filter((f: any) => applyFilters(f, { ...base, departStart: 12, departEnd: 23 } as any)).length).toBe(ord.length);
	const lateNight = ord.filter((f: any) => applyFilters(f, { ...base, departStart: 22, departEnd: 23 } as any));
	expect(lateNight.map((f: any) => f.departureTime)).toContain('10:45 PM');
});
