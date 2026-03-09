/**
 * Demo etkinlik seed scripti
 * Kullanım: Bu fonksiyonu bir butondan çağır ya da doğrudan çalıştır.
 */
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export const DEMO_EVENTS = [
  {
    title: 'DJ Berkay Live Set',
    venueName: 'Kuşadası Marina Sahne',
    artistId: 'berkay',
    artistName: 'DJ Berkay',
    description: 'Kuşadası Marina\'da özel açık hava performansı. House ve Electronic karışımı set.',
    date: Timestamp.fromDate(new Date(Date.now() + 2 * 24 * 3600 * 1000)),
    startTime: '23:00',
    endTime: '04:00',
    genre: ['Electronic', 'House', 'Deep House'],
    ticketPrice: 200,
    attendeeCount: 0,
    status: 'upcoming',
    location: {
      address: 'Kuşadası Yat Limanı, Kuşadası',
      city: 'Aydın',
      lat: 37.8578,
      lng: 27.2597,
    },
    venueId: 'demo_venue_marina',
    createdAt: Timestamp.now(),
  },
  {
    title: 'Ege Gecesi',
    venueName: 'Güvercinada Sahne',
    artistId: 'demo_artist_1',
    artistName: 'DJ Ege',
    description: 'Kuşadası\'nın efsanevi Güvercinada\'sında açık hava elektronik müzik gecesi.',
    date: Timestamp.fromDate(new Date(Date.now() + 3 * 24 * 3600 * 1000)), // 3 gün sonra
    startTime: '22:00',
    endTime: '03:00',
    genre: ['Electronic', 'House'],
    ticketPrice: 150,
    attendeeCount: 0,
    status: 'upcoming',
    location: {
      address: 'Güvercinada, Kuşadası',
      city: 'Aydın',
      lat: 37.8590,
      lng: 27.2554,
    },
    venueId: 'demo_venue_1',
    createdAt: Timestamp.now(),
  },
  {
    title: 'Sunset Jazz',
    venueName: 'Kadınlar Denizi Bar',
    artistId: 'demo_artist_2',
    artistName: 'Kemal Trio',
    description: 'Kuşadası Kadınlar Denizi\'nde gün batımı eşliğinde canlı jazz performansı.',
    date: Timestamp.fromDate(new Date(Date.now() + 5 * 24 * 3600 * 1000)), // 5 gün sonra
    startTime: '19:30',
    endTime: '22:30',
    genre: ['Jazz'],
    ticketPrice: 80,
    attendeeCount: 0,
    status: 'upcoming',
    location: {
      address: 'Kadınlar Plajı Mevkii, Kuşadası',
      city: 'Aydın',
      lat: 37.8482,
      lng: 27.2743,
    },
    venueId: 'demo_venue_2',
    createdAt: Timestamp.now(),
  },
];

export async function seedDemoEvents(): Promise<void> {
  for (const event of DEMO_EVENTS) {
    await addDoc(collection(db, 'events'), event);
  }
}
