import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

@Pipe({
    name: 'translate',
    standalone: true,
    pure: false // Necessary to update when language changes
})
export class TranslatePipe implements PipeTransform {
    private languageService = inject(LanguageService);

    transform(key: string, params?: any): string {
        this.languageService.currentLang(); // Access signal to register dependency in OnPush templates
        return this.languageService.translate(key, params);
    }
}
