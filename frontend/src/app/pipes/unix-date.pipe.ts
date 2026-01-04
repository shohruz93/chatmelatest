import { Pipe, PipeTransform } from '@angular/core';
import { TimestampService } from '../services/timestamp.service';

@Pipe({
  name: 'unixDate',
  standalone: true
})
export class UnixDatePipe implements PipeTransform {
  constructor(private timestampService: TimestampService) {}

  transform(unixTimestamp: number | null | undefined, format: string = 'short'): string {
    if (!unixTimestamp) {
      return '';
    }

    switch (format) {
      case 'relative':
        return this.timestampService.formatRelativeTime(unixTimestamp);
      case 'full':
        return this.timestampService.formatDate(unixTimestamp, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      case 'short':
      default:
        return this.timestampService.formatDate(unixTimestamp, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      case 'time':
        return this.timestampService.formatDate(unixTimestamp, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      case 'date':
        return this.timestampService.formatDate(unixTimestamp, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
    }
  }
}
