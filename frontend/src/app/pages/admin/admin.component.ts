import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, GetUsersResponse } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { AppVersionService } from '../../services/app-version.service';
import { Observable } from 'rxjs';

import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  public usersResponse$!: Observable<GetUsersResponse>;
  public isAdmin = false;

  // App Upload Form


  constructor(
    private adminService: AdminService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (user && user.is_admin) {
      this.isAdmin = true;
      this.usersResponse$ = this.adminService.getUsers();
    }
  }

  banUser(userId: number): void {
    this.adminService.banUser(userId).subscribe(() => {
      // Refresh the user list
      this.usersResponse$ = this.adminService.getUsers();
    });
  }


}
