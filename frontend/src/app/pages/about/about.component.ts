import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
    selector: 'app-about',
    imports: [RouterModule, CommonModule, HeaderComponent, TranslatePipe],
    templateUrl: './about.component.html',
    styleUrl: './about.component.css'
})
export class AboutComponent {
    // Logic moved to HeaderComponent
}
