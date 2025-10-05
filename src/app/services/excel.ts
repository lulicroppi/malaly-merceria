// src/app/services/excel.ts
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as XLSX from 'xlsx';

/** Tipos internos */
type ProveedorPaso1 = {
  nombre: string;
  telefono: string;
  cuit?: string;
  email?: string;
  direccion?: string;
  notas?: string;
};

type ItemProveedor = {
  nombre_base: string;
  variante?: string;
  unidad_compra: string;
  cant_por_unidad_compra: number;
  precio_compra: number; // por unidad de compra
  unidad_venta: string;
  permite_fraccion: boolean;
  permite_entero: boolean;
};

/** Hojas y encabezados del Excel */
const headers = {
  Proveedores: ['id_proveedor', 'nombre', 'cuit', 'telefono', 'email', 'direccion', 'notas'],
  Productos: [
    'id',
    'nombre_base',
    'variante',
    'codigo_interno',
    'unidad_compra',
    'cant_por_unidad_compra',
    'unidad_venta',
    'permite_fraccion',
    'permite_entero',
    'usar_precio_como_venta',
    'precio_compra_por_unidad_compra',
  ],
  ProveedorProductos: [
    'id_proveedor',
    'id_producto',
    'unidad_compra',
    'cant_por_unidad_compra',
    'precio_compra_por_unidad_compra',
    'ultima_actualizacion',
  ],
  Configuraciones: ['clave', 'valor', 'updated_at'],
  Ventas: [
    'id_venta',
    'fecha_hora',
    'medio_pago',
    'estado_pago',
    'pagado_con',
    'fecha_pago',
    'cliente',
    'total',
    'notas',
  ],
  VentaItems: [
    'id_venta',
    'id_producto',
    'nombre_producto',
    'modo',
    'unidad_venta',
    'cantidad',
    'precio_unitario',
    'subtotal',
  ],
} as const;

/** Endpoints y MIME */
const EXCEL_API = '/api/excel';
const EXCEL_ASSET = 'assets/merceria.xlsx';
const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Helpers */
function nowStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

@Injectable({ providedIn: 'root' })
export class ExcelService {
  private ready = false;

  // Detección de plataforma
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  /**
   * Inicializa en el backend: si no existe el Excel en Blob, sube `assets/merceria.xlsx`.
   * Llamalo en Home.ngOnInit().
   */
  async initFromBackend(): Promise<void> {
    if (!this.isBrowser) return; // evita SSR/prerender
    // 1) ¿ya existe en Blob?
    const r = await fetch(EXCEL_API, { method: 'GET', cache: 'no-store' });
    if (r.status === 404) {
      // 2) Seed: subir assets/merceria.xlsx
      const a = await fetch(EXCEL_ASSET, { cache: 'no-cache' });
      if (!a.ok) throw new Error('No se pudo leer assets/merceria.xlsx');
      const blob = await a.blob();
      const up = await fetch(EXCEL_API, {
        method: 'PUT',
        headers: { 'Content-Type': EXCEL_MIME },
        body: blob,
      });
      if (!up.ok) throw new Error('No se pudo crear el Excel en el backend.');
      // Asegurar estructura mínima
      await this.ensureAllSheets();
    } else if (!r.ok) {
      throw new Error('No se pudo leer el Excel del backend.');
    } else {
      // existe → asegurar estructura por si falta alguna hoja
      await this.ensureAllSheets();
    }
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  // ================== Utilidades del workbook (GET/PUT contra /api/excel) ==================

  private async readWorkbook(): Promise<{ wb: XLSX.WorkBook }> {
    if (!this.isBrowser) throw new Error('Solo disponible en navegador');
    const res = await fetch(EXCEL_API, { method: 'GET', cache: 'no-store' });
    if (!res.ok) throw new Error('Error leyendo Excel del backend.');
    const ab = await res.arrayBuffer();
    const wb = XLSX.read(ab, { type: 'array' });
    return { wb };
  }

  private async saveWorkbook(wb: XLSX.WorkBook): Promise<void> {
    if (!this.isBrowser) throw new Error('Solo disponible en navegador');
    const ab = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([ab], { type: EXCEL_MIME });
    const r = await fetch(EXCEL_API, {
      method: 'PUT',
      headers: { 'Content-Type': EXCEL_MIME },
      body: blob,
    });
    if (!r.ok) throw new Error('No se pudo guardar el Excel en backend.');
  }

  private toAOA(ws?: XLSX.WorkSheet): any[][] {
    if (!ws) return [];
    return XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  }

  private ensureSheet(wb: XLSX.WorkBook, name: keyof typeof headers): any[][] {
    const ws = wb.Sheets[name as string];
    let aoa = this.toAOA(ws);
    if (!aoa || aoa.length === 0) {
      const initHeader = Array.from((headers as any)[name]) as any[];
      aoa = [initHeader];
      wb.Sheets[name as string] = XLSX.utils.aoa_to_sheet(aoa);
      if (!wb.SheetNames.includes(name as string)) wb.SheetNames.push(name as string);
    }
    return aoa;
  }

  private writeSheet(wb: XLSX.WorkBook, name: string, data: any[][]) {
    wb.Sheets[name] = XLSX.utils.aoa_to_sheet(data);
    if (!wb.SheetNames.includes(name)) wb.SheetNames.push(name);
  }

  /** Asegura que TODAS las hojas existan con su header; guarda si creó alguna. */
  private async ensureAllSheets(): Promise<void> {
    if (!this.isBrowser) return;
    const { wb } = await this.readWorkbook();
    let touched = false;
    (Object.keys(headers) as Array<keyof typeof headers>).forEach((name) => {
      const ws = wb.Sheets[name as string];
      const aoa = this.toAOA(ws);
      if (!aoa || aoa.length === 0) {
        const init: any[][] = [Array.from((headers as any)[name]) as any[]];
        this.writeSheet(wb, name as string, init);
        touched = true;
      }
    });
    if (touched) await this.saveWorkbook(wb);
  }

  // ================== Flujos usados en tus pantallas ==================

  /** Crear proveedor + sus productos/proveedor (Paso 1 + Paso 2). */
  async guardarProveedorYProductos(proveedor: ProveedorPaso1, items: ItemProveedor[]) {
    const { wb } = await this.readWorkbook();

    const provAoa = this.ensureSheet(wb, 'Proveedores');
    const prodAoa = this.ensureSheet(wb, 'Productos');
    const ppAoa = this.ensureSheet(wb, 'ProveedorProductos');

    const idx = (hdrs: string[]) =>
      Object.fromEntries(hdrs.map((h, i) => [h, i])) as Record<string, number>;
    const provIdx = idx(provAoa[0] as string[]);
    const prodIdx = idx(prodAoa[0] as string[]);
    const ppIdx = idx(ppAoa[0] as string[]);

    // ---- Alta proveedor
    const provId = `prov_${Date.now()}`;
    const provRow: any[] = new Array((provAoa[0] as any[]).length).fill('');
    provRow[provIdx['id_proveedor']] = provId;
    provRow[provIdx['nombre']] = proveedor.nombre || '';
    provRow[provIdx['cuit']] = proveedor.cuit || '';
    provRow[provIdx['telefono']] = proveedor.telefono || '';
    provRow[provIdx['email']] = proveedor.email || '';
    provRow[provIdx['direccion']] = proveedor.direccion || '';
    provRow[provIdx['notas']] = proveedor.notas || '';
    (provAoa as any[][]).push(provRow);

    // ---- Productos + relaciones
    const findProduct = (nombre_base: string, variante?: string) => {
      const nb = (nombre_base || '').trim().toLowerCase();
      const varN = (variante || '').trim().toLowerCase();
      for (let r = 1; r < prodAoa.length; r++) {
        const row = prodAoa[r] || [];
        const nb2 = String(row[prodIdx['nombre_base']] || '').trim().toLowerCase();
        const var2 = String(row[prodIdx['variante']] || '').trim().toLowerCase();
        if (nb2 === nb && var2 === varN) return { row, r };
      }
      return null;
    };

    const ensureProduct = (it: ItemProveedor) => {
      const found = findProduct(it.nombre_base, it.variante);
      if (found) {
        const row = found.row as any[];
        if (!row[prodIdx['unidad_compra']]) row[prodIdx['unidad_compra']] = it.unidad_compra;
        if (!row[prodIdx['cant_por_unidad_compra']])
          row[prodIdx['cant_por_unidad_compra']] = it.cant_por_unidad_compra;
        if (!row[prodIdx['unidad_venta']]) row[prodIdx['unidad_venta']] = it.unidad_venta;
        if (row[prodIdx['permite_fraccion']] === undefined)
          row[prodIdx['permite_fraccion']] = it.permite_fraccion ? 1 : 0;
        if (row[prodIdx['permite_entero']] === undefined)
          row[prodIdx['permite_entero']] = it.permite_entero ? 1 : 0;
        const prodId = row[prodIdx['id']] || `prod_${Date.now()}`;
        row[prodIdx['id']] = prodId;
        return String(prodId);
      } else {
        const prodId = `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const newRow: any[] = new Array((prodAoa[0] as any[]).length).fill('');
        newRow[prodIdx['id']] = prodId;
        newRow[prodIdx['nombre_base']] = it.nombre_base || '';
        newRow[prodIdx['variante']] = it.variante || '';
        newRow[prodIdx['codigo_interno']] = '';
        newRow[prodIdx['unidad_compra']] = it.unidad_compra;
        newRow[prodIdx['cant_por_unidad_compra']] = it.cant_por_unidad_compra;
        newRow[prodIdx['unidad_venta']] = it.unidad_venta;
        newRow[prodIdx['permite_fraccion']] = it.permite_fraccion ? 1 : 0;
        newRow[prodIdx['permite_entero']] = it.permite_entero ? 1 : 0;
        newRow[prodIdx['usar_precio_como_venta']] = 0;
        newRow[prodIdx['precio_compra_por_unidad_compra']] = 0;
        (prodAoa as any[][]).push(newRow);
        return prodId;
      }
    };

    const now = nowStr();
    for (const it of items) {
      const prodId = ensureProduct(it);
      const ppRow: any[] = new Array((ppAoa[0] as any[]).length).fill('');
      ppRow[ppIdx['id_proveedor']] = provId;
      ppRow[ppIdx['id_producto']] = prodId;
      ppRow[ppIdx['unidad_compra']] = it.unidad_compra;
      ppRow[ppIdx['cant_por_unidad_compra']] = it.cant_por_unidad_compra;
      ppRow[ppIdx['precio_compra_por_unidad_compra']] = it.precio_compra;
      ppRow[ppIdx['ultima_actualizacion']] = now;
      (ppAoa as any[][]).push(ppRow);
    }

    this.writeSheet(wb, 'Proveedores', provAoa);
    this.writeSheet(wb, 'Productos', prodAoa);
    this.writeSheet(wb, 'ProveedorProductos', ppAoa);
    await this.saveWorkbook(wb);
  }

  /** Listar proveedores */
  async listProveedores(): Promise<
    Array<{
      id_proveedor: string;
      nombre: string;
      telefono: string;
      cuit?: string;
      email?: string;
      direccion?: string;
      notas?: string;
    }>
  > {
    const { wb } = await this.readWorkbook();
    const provAoa = this.ensureSheet(wb, 'Proveedores');
    const idx = Object.fromEntries((provAoa[0] as string[]).map((h, i) => [h, i])) as Record<
      string,
      number
    >;

    const out: any[] = [];
    for (let r = 1; r < provAoa.length; r++) {
      const row = provAoa[r] || [];
      const id = String(row[idx['id_proveedor']] || '').trim();
      if (!id) continue;
      out.push({
        id_proveedor: id,
        nombre: String(row[idx['nombre']] || '').trim(),
        telefono: String(row[idx['telefono']] || '').trim(),
        cuit: String(row[idx['cuit']] || '').trim(),
        email: String(row[idx['email']] || '').trim(),
        direccion: String(row[idx['direccion']] || '').trim(),
        notas: String(row[idx['notas']] || '').trim(),
      });
    }
    out.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return out as any[];
  }

  /** Traer un proveedor por id */
  async getProveedor(id_proveedor: string) {
    const { wb } = await this.readWorkbook();
    const provAoa = this.ensureSheet(wb, 'Proveedores');
    const map = Object.fromEntries((provAoa[0] as string[]).map((h, i) => [h, i])) as Record<
      string,
      number
    >;

    for (let r = 1; r < provAoa.length; r++) {
      const row = provAoa[r] || [];
      const id = String(row[map['id_proveedor']] || '').trim();
      if (id === id_proveedor) {
        return {
          rowIndex: r,
          id_proveedor: id,
          nombre: String(row[map['nombre']] || '').trim(),
          telefono: String(row[map['telefono']] || '').trim(),
          cuit: String(row[map['cuit']] || '').trim(),
          email: String(row[map['email']] || '').trim(),
          direccion: String(row[map['direccion']] || '').trim(),
          notas: String(row[map['notas']] || '').trim(),
        };
      }
    }
    return null;
  }

  /** Actualizar datos básicos del proveedor */
  async updateProveedorBasic(p: {
    id_proveedor: string;
    nombre: string;
    telefono: string;
    cuit?: string;
    email?: string;
    direccion?: string;
    notas?: string;
  }) {
    const { wb } = await this.readWorkbook();
    const provAoa = this.ensureSheet(wb, 'Proveedores');
    const map = Object.fromEntries((provAoa[0] as string[]).map((h, i) => [h, i])) as Record<
      string,
      number
    >;

    let rowIndex = -1;
    for (let r = 1; r < provAoa.length; r++) {
      const row = provAoa[r] || [];
      const id = String(row[map['id_proveedor']] || '').trim();
      if (id === p.id_proveedor) {
        rowIndex = r;
        break;
      }
    }
    if (rowIndex < 0) throw new Error('Proveedor no encontrado en Excel.');

    const row = provAoa[rowIndex] as any[];
    row[map['nombre']] = p.nombre ?? '';
    row[map['telefono']] = p.telefono ?? '';
    row[map['cuit']] = p.cuit ?? '';
    row[map['email']] = p.email ?? '';
    row[map['direccion']] = p.direccion ?? '';
    row[map['notas']] = p.notas ?? '';

    this.writeSheet(wb, 'Proveedores', provAoa);
    await this.saveWorkbook(wb);
  }
}

// Export default adicional por compatibilidad de imports
export default ExcelService;