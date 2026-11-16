/**
 * @jest-environment node
 */
// Node environment: cheerio's undici dependency needs web-stream globals that
// CRA's jsdom environment lacks (the same reason App.test.tsx cannot load).
import fs from 'fs';
import path from 'path';
import { flightDates, flightSlug } from './flightAsset';

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
	['flight_ORDLAX_results.txt', 28],
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
