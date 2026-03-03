import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
    selector: 'app-features',
    imports: [RouterModule, CommonModule, HeaderComponent, TranslatePipe],
    templateUrl: './features.component.html',
    styleUrl: './features.component.css'
})
export class FeaturesComponent {
    // Logic moved to HeaderComponent
}
