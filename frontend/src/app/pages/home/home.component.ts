import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Capacitor } from '@capacitor/core';
import { AppVersionService } from '../../services/app-version.service';
import { environment } from '../../../environments/environment';

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
            this.appVersionService.checkLatestVersion('android').subscribe({
                next: (res) => {
                    if (res && res.latest_version) {
                        this.downloadUrls.android = `${environment.phpBaseUrl}/app/download?platform=android`;
                    }
                }
            });

            this.appVersionService.checkLatestVersion('ios').subscribe({
                next: (res) => {
                    if (res && res.latest_version) {
                        this.downloadUrls.ios = `${environment.phpBaseUrl}/app/download?platform=ios`;
                    }
                }
            });
        }
    }
}
