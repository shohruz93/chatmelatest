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
   * @param unixTimestamp Unix timestamp in seconds
   * @param format Format string (uses Intl.DateTimeFormat)
   * @returns Formatted date string
   */
  formatDate(unixTimestamp: number | null | undefined, format: Intl.DateTimeFormatOptions = {}): string {
    if (!unixTimestamp) {
      return '';
    }
    const date = this.unixToDate(unixTimestamp);
    if (!date) {
      return '';
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
   * Format Unix timestamp as relative time (e.g., "2 hours ago")
   * @param unixTimestamp Unix timestamp in seconds
   * @returns Relative time string
   */
  formatRelativeTime(unixTimestamp: number | null | undefined): string {
    if (!unixTimestamp) {
      return '';
    }

    const date = this.unixToDate(unixTimestamp);
    if (!date) {
      return '';
    }

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
