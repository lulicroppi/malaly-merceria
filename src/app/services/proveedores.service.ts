import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

export interface Proveedor {
  id: string;
  nombre: string;
  telefono: string;
  cuit?: string;
  email?: string;
  direccion?: string;
  notas?: string;
}

@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  // Por ahora, memoria. (Después lo conectamos al Excel)
  private _proveedores: Proveedor[] = [];

  // Simula un check asíncrono (case-insensitive, trim)
  nombreExiste$(nombre: string): Observable<boolean> {
    const n = (nombre || '').trim().toLowerCase();
    const exists = this._proveedores.some(p => p.nombre.trim().toLowerCase() === n);
    return of(exists).pipe(delay(200));
  }

  add(proveedor: Proveedor) { this._proveedores.push(proveedor); }
  list(): Proveedor[] { return [...this._proveedores]; }
}