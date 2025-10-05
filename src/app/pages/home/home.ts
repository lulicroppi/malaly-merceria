// src/app/pages/home/home.ts
import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ExcelService } from '../../services/excel';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.sss'
})
export class HomeComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);

  loadingExcel = true;
  errorExcel = '';

  constructor(private excel: ExcelService) {}

  async ngOnInit() {
    // Evitar SSR: solo correr en browser
    if (!isPlatformBrowser(this.platformId)) {
      this.loadingExcel = false;
      return;
    }
    try {
      await this.excel.initFromBackend(); // seed si falta, asegura hojas
    } catch (e: any) {
      this.errorExcel = e?.message || 'No se pudo inicializar el Excel.';
      console.error(this.errorExcel, e);
    } finally {
      this.loadingExcel = false;
    }
  }
}