import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ExcelService } from '../../services/excel';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit {
  loadingExcel = true;
  errorExcel = '';

  constructor(private excel: ExcelService) {}

  async ngOnInit() {
    try {
      // Inicializa el Excel en el backend (si no existe, lo crea desde assets)
      await this.excel.initFromBackend();
    } catch (e: any) {
      this.errorExcel = e?.message || 'No se pudo inicializar el Excel.';
      console.error(e);
    } finally {
      this.loadingExcel = false;
    }
  }
}