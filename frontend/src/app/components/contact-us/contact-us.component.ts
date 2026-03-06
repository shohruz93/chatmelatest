import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
    selector: 'app-contact-us',
    standalone: true,
    imports: [CommonModule, RouterModule, HeaderComponent, TranslatePipe],
    templateUrl: './contact-us.component.html',
    styleUrl: './contact-us.component.css'
})
export class ContactUsComponent {
}
