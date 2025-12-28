import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppVersionService } from '../../../services/app-version.service';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-app-versions',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './app-versions.component.html',
    styles: [`
    .container { padding: 20px; }
  `]
})
export class AppVersionsComponent implements OnInit {
    appVersionService = inject(AppVersionService);

    versions$!: Observable<any[]>;

    // App Upload Form
    selectedFile: File | null = null;
    platform = 'android';
    version = '';
    versionCode = 0;
    releaseNotes = '';
    fileUrl = '';
    uploadMessage = '';

    ngOnInit() {
        this.loadVersions();
    }

    loadVersions() {
        this.versions$ = this.appVersionService.getAppVersions();
    }

    onFileSelected(event: any) {
        this.selectedFile = event.target.files[0];
    }

    uploadApp() {
        if (!this.platform || !this.version || !this.versionCode) {
            this.uploadMessage = 'Please fill all required fields';
            return;
        }

        const formData = new FormData();
        formData.append('platform', this.platform);
        formData.append('version', this.version);
        formData.append('version_code', this.versionCode.toString());
        formData.append('release_notes', this.releaseNotes);

        if (this.selectedFile) {
            formData.append('file', this.selectedFile);
        } else if (this.fileUrl) {
            formData.append('file_url', this.fileUrl);
        } else {
            this.uploadMessage = 'Please select a file or provide a URL';
            return;
        }

        this.appVersionService.uploadAppVersion(formData).subscribe({
            next: (res) => {
                this.uploadMessage = 'Upload successful!';
                // Reset form
                this.version = '';
                this.versionCode = 0;
                this.releaseNotes = '';
                this.selectedFile = null;
                this.fileUrl = '';
                // Refresh list
                this.loadVersions();
            },
            error: (err) => {
                this.uploadMessage = 'Upload failed: ' + (err.error?.error || err.message);
            }
        });
    }
}
