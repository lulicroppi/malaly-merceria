import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ExcelService } from '../services/excel';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './root.html',
  styleUrl: './root.scss'
})
export class RootComponent implements OnInit {
  loading = true;
  needsExcel = false;
  errorMsg = '';

  constructor(private excel: ExcelService) {}

  async ngOnInit() {
    try {
      // ¿ya tenemos handle guardado y con permiso?
      this.needsExcel = !(await this.excel.hasHandle());
    } catch (e:any) {
      this.needsExcel = true;
      this.errorMsg = 'No se pudo verificar el archivo Excel.';
    } finally {
      this.loading = false;
    }
  }

  async elegirExcel() {
    try {
      await this.excel.ensureHandle();   // abre el diálogo SOLO la primera vez
      this.needsExcel = false;           // ya podemos renderizar la app
    } catch (e:any) {
      this.errorMsg = e?.message || 'No se pudo seleccionar el archivo Excel.';
      alert(this.errorMsg);
    }
  }
}