import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Capacitor } from '@capacitor/core';
import { AppVersionService } from '../../services/app-version.service';

@Component({
    selector: 'app-home',
    imports: [RouterModule, CommonModule, HeaderComponent, TranslatePipe],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
    isWeb = true;
    downloadUrls: { android: string | null; ios: string | null } = { android: null, ios: null };

    constructor(private appVersionService: AppVersionService) { }

    ngOnInit() {
        try {
            // show only on web (not inside Capacitor native apps)
            this.isWeb = !Capacitor.isNativePlatform();
        } catch (e) {
            this.isWeb = true;
        }

        if (this.isWeb) {
            // Directly link to Google Play Store and hide iOS button as requested
            this.downloadUrls.android = 'https://play.google.com/store/apps/details?id=com.shohruz.chatme&pli=1';
            this.downloadUrls.ios = null;
        }
    }
}
