import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeUrl, SafeResourceUrl } from '@angular/platform-browser';

@Pipe({
    name: 'safeUrl',
    standalone: true
})
export class SafeUrlPipe implements PipeTransform {
    private sanitizer = inject(DomSanitizer);

    transform(url: string, type: 'url' | 'resourceUrl' = 'url'): SafeUrl | SafeResourceUrl {
        if (!url) return '';
        switch (type) {
            case 'resourceUrl':
                return this.sanitizer.bypassSecurityTrustResourceUrl(url);
            default:
                return this.sanitizer.bypassSecurityTrustUrl(url);
        }
    }
}
