import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

@Pipe({
    name: 'translate',
    standalone: true,
    pure: false // Necessary to update when language changes
})
export class TranslatePipe implements PipeTransform {
    private languageService = inject(LanguageService);

    transform(key: string): string {
        return this.languageService.translate(key);
    }
}
