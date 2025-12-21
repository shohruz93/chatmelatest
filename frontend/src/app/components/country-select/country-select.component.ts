import { Component, Input, Output, EventEmitter, forwardRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { CountryService } from '../../services/country.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
    selector: 'app-country-select',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe],
    templateUrl: './country-select.component.html',
    styleUrls: ['./country-select.component.css'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => CountrySelectComponent),
            multi: true
        }
    ]
})
export class CountrySelectComponent implements ControlValueAccessor {
    @Input() showAny: boolean = true;
    @Input() placeholder: string = 'Select a country';
    @Input() label: string = '';
    @Input() disabled: boolean = false;
    @Input() type: 'country' | 'language' = 'country';
    @Output() selectionChange = new EventEmitter<string>();

    private countryService = inject(CountryService);

    value: string = '';
    isOpen: boolean = false;
    searchTerm: string = '';

    private onChange: (value: string) => void = () => { };
    private onTouched: () => void = () => { };

    get options() {
        let opts: any[];
        if (this.type === 'language') {
            opts = this.countryService.getLanguageOptions(this.showAny);
        } else {
            opts = this.countryService.getCountryOptions(this.showAny);
        }

        if (this.showAny && this.label && opts.length > 0 && opts[0].value === 'any') {
            opts[0].label = this.label;
        }
        return opts;
    }

    get filteredOptions() {
        if (!this.searchTerm) {
            return this.options;
        }
        const term = this.searchTerm.toLowerCase();
        return this.options.filter(opt =>
            opt.label.toLowerCase().includes(term)
        );
    }

    get selectedOption() {
        return this.options.find(opt => opt.value === this.value);
    }

    toggleDropdown() {
        if (!this.disabled) {
            this.isOpen = !this.isOpen;
            if (this.isOpen) {
                this.searchTerm = '';
            }
        }
    }

    closeDropdown() {
        this.isOpen = false;
        this.searchTerm = '';
    }

    selectOption(option: { value: string; label: string; flagUrl: string }) {
        this.value = option.value;
        this.onChange(this.value);
        this.onTouched();
        this.selectionChange.emit(this.value);
        this.closeDropdown();
    }

    // ControlValueAccessor implementation
    writeValue(value: string): void {
        this.value = value || '';
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    onClickOutside(event: Event) {
        this.closeDropdown();
    }
}
