import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
    selector: 'app-home',
    imports: [RouterModule, CommonModule, HeaderComponent, TranslatePipe],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent {
    // Logic moved to HeaderComponent
}
