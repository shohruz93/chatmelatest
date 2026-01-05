import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TimestampService {
  constructor() { }

  /**
   * Convert Unix timestamp (seconds) to JavaScript Date object
   * @param unixTimestamp Unix timestamp in seconds
   * @returns Date object in user's local timezone
   */
  unixToDate(unixTimestamp: number | null | undefined): Date | null {
    if (!unixTimestamp) {
      return null;
    }
    return new Date(unixTimestamp * 1000);
  }

  /**
   * Convert JavaScript Date to Unix timestamp (seconds)
   * @param date Date object
   * @returns Unix timestamp in seconds
   */
  dateToUnix(date: Date): number {
    return Math.floor(date.getTime() / 1000);
  }

  /**
   * Get current time as Unix timestamp
   * @returns Unix timestamp in seconds
   */
  now(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Format Unix timestamp to human-readable date string
   * @param unixTimestamp Unix timestamp in seconds or milliseconds
   * @param format Format string (uses Intl.DateTimeFormat)
   * @returns Formatted date string or 'Invalid Date' if timestamp is invalid
   */
  formatDate(unixTimestamp: number | null | undefined, format: Intl.DateTimeFormatOptions = {}): string {
    if (unixTimestamp === null || unixTimestamp === undefined) {
      return '';
    }
    
    const date = this.toValidDate(unixTimestamp);
    if (!date) {
      return 'Invalid Date';
    }

    const defaultFormat: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    return date.toLocaleDateString(undefined, { ...defaultFormat, ...format });
  }

  /**
   * Convert to a valid Date object, handling both seconds and milliseconds
   * @param timestamp Unix timestamp (seconds or milliseconds)
   * @returns Valid Date object or null if invalid
   */
  private toValidDate(timestamp: number | any): Date | null {
    if (typeof timestamp !== 'number') {
      if (timestamp instanceof Date) {
        return isNaN(timestamp.getTime()) ? null : timestamp;
      }
      return null;
    }

    let date: Date;
    if (timestamp < 10000000000) {
      date = new Date(timestamp * 1000);
    } else {
      date = new Date(timestamp);
    }

    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Safe format of timestamp for display - handles invalid dates
   * @param timestamp Unix timestamp in seconds or milliseconds
   * @param formatOptions Date format options
   * @returns Formatted date string
   */
  safeFormatDate(timestamp: number | Date | null | undefined, formatOptions: Intl.DateTimeFormatOptions = {}): string {
    if (timestamp === null || timestamp === undefined) {
      return '';
    }

    const date = this.toValidDate(typeof timestamp === 'number' ? timestamp : timestamp instanceof Date ? timestamp.getTime() : null);
    if (!date) {
      return 'Invalid Date';
    }

    const defaultFormat: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };

    try {
      return date.toLocaleDateString(undefined, { ...defaultFormat, ...formatOptions });
    } catch (e) {
      return 'Invalid Date';
    }
  }

  /**
   * Format timestamp as time only (HH:mm) - handles invalid dates
   * @param timestamp Unix timestamp
   * @returns Formatted time string
   */
  safeFormatTime(timestamp: number | Date | null | undefined): string {
    if (timestamp === null || timestamp === undefined) {
      return '';
    }

    const date = this.toValidDate(typeof timestamp === 'number' ? timestamp : timestamp instanceof Date ? timestamp.getTime() : null);
    if (!date) {
      return 'Invalid Date';
    }

    try {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Invalid Date';
    }
  }

  /**
   * Format timestamp as date only - handles invalid dates
   * @param timestamp Unix timestamp
   * @returns Formatted date string
   */
  safeFormatDateOnly(timestamp: number | Date | null | undefined): string {
    if (timestamp === null || timestamp === undefined) {
      return '';
    }

    const date = this.toValidDate(typeof timestamp === 'number' ? timestamp : timestamp instanceof Date ? timestamp.getTime() : null);
    if (!date) {
      return 'Invalid Date';
    }

    try {
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return 'Invalid Date';
    }
  }

  /**
   * Format Unix timestamp as relative time (e.g., "2 hours ago")
   * @param unixTimestamp Unix timestamp in seconds or milliseconds
   * @returns Relative time string or 'Invalid Date' if timestamp is invalid
   */
  formatRelativeTime(unixTimestamp: number | null | undefined): string {
    if (!unixTimestamp) {
      return '';
    }

    const date = this.toValidDate(unixTimestamp);
    if (!date) {
      return 'Invalid Date';
    }

    try {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSeconds < 60) {
        return 'just now';
      } else if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
      } else {
        const years = Math.floor(diffDays / 365);
        return `${years} year${years > 1 ? 's' : ''} ago`;
      }
    } catch (e) {
      return 'Invalid Date';
    }
  }

  /**
   * Check if a Unix timestamp is within the last N hours
   * @param unixTimestamp Unix timestamp in seconds
   * @param hours Number of hours
   * @returns true if timestamp is within the last N hours
   */
  isWithinHours(unixTimestamp: number | null | undefined, hours: number): boolean {
    if (!unixTimestamp) {
      return false;
    }
    const now = Math.floor(Date.now() / 1000);
    const secondsAgo = now - unixTimestamp;
    return secondsAgo <= (hours * 3600);
  }

  /**
   * Check if a Unix timestamp is from today
   * @param unixTimestamp Unix timestamp in seconds
   * @returns true if timestamp is from today
   */
  isToday(unixTimestamp: number | null | undefined): boolean {
    if (!unixTimestamp) {
      return false;
    }
    const date = this.unixToDate(unixTimestamp);
    if (!date) {
      return false;
    }
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }

  /**
   * Check if a Unix timestamp is from yesterday
   * @param unixTimestamp Unix timestamp in seconds
   * @returns true if timestamp is from yesterday
   */
  isYesterday(unixTimestamp: number | null | undefined): boolean {
    if (!unixTimestamp) {
      return false;
    }
    const date = this.unixToDate(unixTimestamp);
    if (!date) {
      return false;
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();
  }

  /**
   * Get user's timezone offset in minutes
   * @returns Timezone offset in minutes
   */
  getTimezoneOffset(): number {
    return new Date().getTimezoneOffset();
  }

  /**
   * Get user's timezone name
   * @returns Timezone name (e.g., "UTC+05:00")
   */
  getTimezoneName(): string {
    const date = new Date();
    const offset = -date.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0');
    const minutes = (Math.abs(offset) % 60).toString().padStart(2, '0');
    return `UTC${sign}${hours}:${minutes}`;
  }
}
