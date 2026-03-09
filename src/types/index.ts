export type UserType = 'customer' | 'artist' | 'venue';

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  userType: UserType;
  createdAt: Date;
}

export interface Artist {
  id: string;
  userId: string;
  displayName: string;
  genre: string[];
  bio: string;
  photoURL?: string;
  rating: number;
  reviewCount: number;
  followers: number;
  location: string;
  priceRange: { min: number; max: number };
  socialLinks?: {
    instagram?: string;
    spotify?: string;
    youtube?: string;
  };
  isVerified: boolean;
}

export interface Venue {
  id: string;
  userId: string;
  name: string;
  description: string;
  photoURL?: string;
  coverPhotoURL?: string;
  rating: number;
  reviewCount: number;
  location: {
    address: string;
    city: string;
    lat: number;
    lng: number;
  };
  capacity: number;
  genres: string[];
  amenities: string[];
  isVerified: boolean;
}

export interface Event {
  id: string;
  venueId: string;
  venueName: string;
  artistId?: string;
  artistName?: string;
  title: string;
  description: string;
  date: Date;
  startTime: string;
  endTime?: string;
  imageURL?: string;
  ticketPrice?: number;
  genre: string[];
  location: {
    address: string;
    city: string;
    lat: number;
    lng: number;
  };
  attendeeCount: number;
  status: 'upcoming' | 'live' | 'past';
}

export interface Review {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  targetId: string;
  targetType: 'artist' | 'venue';
  rating: number;
  comment: string;
  createdAt: Date;
}
