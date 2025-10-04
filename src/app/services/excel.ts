// src/app/services/excel.ts
import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

type ProveedorPaso1 = {
  nombre: string; telefono: string; cuit?: string; email?: string; direccion?: string; notas?: string;
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

const headers = {
  Proveedores: ["id_proveedor", "nombre", "cuit", "telefono", "email", "direccion", "notas"],
  Productos: [
    "id", "nombre_base", "variante", "codigo_interno",
    "unidad_compra", "cant_por_unidad_compra",
    "unidad_venta", "permite_fraccion", "permite_entero",
    "usar_precio_como_venta", "precio_compra_por_unidad_compra"
  ],
  ProveedorProductos: [
    "id_proveedor", "id_producto",
    "unidad_compra", "cant_por_unidad_compra",
    "precio_compra_por_unidad_compra", "ultima_actualizacion"
  ],
  Configuraciones: ["clave", "valor", "updated_at"],
  Ventas: ["id_venta", "fecha_hora", "medio_pago", "estado_pago", "pagado_con", "fecha_pago", "cliente", "total", "notas"],
  VentaItems: ["id_venta", "id_producto", "nombre_producto", "modo", "unidad_venta", "cantidad", "precio_unitario", "subtotal"],
} as const;

function nowStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

@Injectable({ providedIn: 'root' })
export class ExcelService {
  private DB_NAME = 'merceria-db';
  private STORE = 'fs';
  private HANDLE_KEY = 'excelHandle';

  // ========= IndexedDB helpers =========
  private async openDB(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB no disponible');
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.STORE)) {
          db.createObjectStore(this.STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  private async idbGet<T = any>(key: string): Promise<T | undefined> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readonly');
      const st = tx.objectStore(this.STORE);
      const r = st.get(key);
      r.onsuccess = () => resolve(r.result as T);
      r.onerror = () => reject(r.error);
    });
  }
  private async idbSet(key: string, value: any): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readwrite');
      const st = tx.objectStore(this.STORE);
      const r = st.put(value, key);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }
  private async idbDel(key: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readwrite');
      const st = tx.objectStore(this.STORE);
      const r = st.delete(key);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }

  // ========= File System Access helpers =========
  private async verifyRW(handle: any): Promise<boolean> {
    try {
      const opts = { mode: 'readwrite' as const };
      const q = await handle?.queryPermission?.(opts);
      if (q === 'granted') return true;
      const r = await handle?.requestPermission?.(opts);
      return r === 'granted';
    } catch {
      return false;
    }
  }

  private async pickHandle(): Promise<any> {
    const canPick = typeof (window as any).showOpenFilePicker === 'function';
    if (!canPick) throw new Error('Este navegador no permite seleccionar un archivo para escritura directa.');
    const [handle] = await (window as any).showOpenFilePicker({
      multiple: false,
      types: [{
        description: 'Excel',
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
      }]
    });
    return handle;
  }

  // ========= API que vamos a usar en el inicio =========
  /** Devuelve true si ya tenemos el handle con permiso RW listo. No abre diálogos. */
  async hasHandle(): Promise<boolean> {
    try {
      const handle = await this.idbGet<any>(this.HANDLE_KEY);
      if (!handle) return false;
      return await this.verifyRW(handle);
    } catch {
      return false;
    }
  }

  /** Pide el archivo al usuario (diálogo), verifica permisos y lo guarda. */
  async ensureHandle(): Promise<any> {
    // Intentar con el guardado en IndexedDB
    let handle = await this.idbGet<any>(this.HANDLE_KEY);
    if (handle && await this.verifyRW(handle)) return handle;

    // Si no hay o no tiene permiso, pedirlo y guardarlo
    handle = await this.pickHandle();
    const ok = await this.verifyRW(handle);
    if (!ok) throw new Error('Sin permiso de lectura/escritura para el Excel seleccionado.');
    await this.idbSet(this.HANDLE_KEY, handle);
    return handle;
  }

  /** Olvida el archivo guardado (para re-seleccionar). */
  async forgetHandle() { await this.idbDel(this.HANDLE_KEY); }

  // ========= Lectura/Escritura de workbook =========
  private async readWorkbook(handle: any): Promise<{ wb: XLSX.WorkBook, filename: string }> {
    const file = await handle.getFile();
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: 'array' });
    return { wb, filename: file.name };
  }

  private writeSheet(wb: XLSX.WorkBook, name: string, data: any[][]) {
    wb.Sheets[name] = XLSX.utils.aoa_to_sheet(data);
    if (!wb.SheetNames.includes(name)) wb.SheetNames.push(name);
  }

  private toAOA(ws?: XLSX.WorkSheet): any[][] {
    if (!ws) return [];
    return XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  }

  private ensureSheet(wb: XLSX.WorkBook, name: keyof typeof headers): any[][] {
    const ws = wb.Sheets[name];
    let aoa = this.toAOA(ws);
    if (!aoa || aoa.length === 0) {
      aoa = [(headers as any)[name].slice()];
      wb.Sheets[name] = XLSX.utils.aoa_to_sheet(aoa);
      if (!wb.SheetNames.includes(name)) wb.SheetNames.push(name);
    }
    return aoa;
  }

  // ========= Guardado usado en Paso 2 =========
  async guardarProveedorYProductos(proveedor: ProveedorPaso1, items: ItemProveedor[]) {
    // Asegurar el mismo handle siempre (si no hay, abre diálogo UNA vez)
    let handle: any;
    try {
      handle = await this.ensureHandle();
    } catch (e) {
      // fallback descarga (navegadores sin FS Access)
      console.warn('FS Access no disponible. Se usará descarga como fallback.', e);
      return await this.guardarConDescarga(proveedor, items);
    }



    // Leer workbook actual
    const { wb, filename } = await this.readWorkbook(handle);

    // Asegurar hojas
    const provAoa = this.ensureSheet(wb, 'Proveedores');
    const prodAoa = this.ensureSheet(wb, 'Productos');
    const ppAoa = this.ensureSheet(wb, 'ProveedorProductos');

    // Índices
    const idx = (hdrs: string[]) =>
      Object.fromEntries(hdrs.map((h, i) => [h, i])) as Record<string, number>;
    const provIdx = idx(provAoa[0] as string[]);
    const prodIdx = idx(prodAoa[0] as string[]);
    const ppIdx = idx(ppAoa[0] as string[]);

    // Alta proveedor
    const provId = `prov_${Date.now()}`;
    const provRow: any[] = new Array((provAoa[0] as any[]).length).fill('');
    provRow[provIdx['id_proveedor']] = provId;
    provRow[provIdx['nombre']] = proveedor.nombre || '';
    provRow[provIdx['cuit']] = proveedor.cuit || '';
    provRow[provIdx['telefono']] = proveedor.telefono || '';
    provRow[provIdx['email']] = proveedor.email || '';
    provRow[provIdx['direccion']] = proveedor.direccion || '';
    provRow[provIdx['notas']] = proveedor.notas || '';
    provAoa.push(provRow);

    // Productos + relaciones
    const findProduct = (nombre_base: string, variante?: string) => {
      const nb = (nombre_base || '').trim().toLowerCase();
      const varN = (variante || '').trim().toLowerCase();
      for (let r = 1; r < prodAoa.length; r++) {
        const row = prodAoa[r];
        const nb2 = String(row[prodIdx['nombre_base']] || '').trim().toLowerCase();
        const var2 = String(row[prodIdx['variante']] || '').trim().toLowerCase();
        if (nb2 === nb && var2 === varN) return { row, r };
      }
      return null;
    };

    const ensureProduct = (it: ItemProveedor) => {
      const found = findProduct(it.nombre_base, it.variante);
      if (found) {
        const row = found.row;
        if (!row[prodIdx['unidad_compra']]) row[prodIdx['unidad_compra']] = it.unidad_compra;
        if (!row[prodIdx['cant_por_unidad_compra']]) row[prodIdx['cant_por_unidad_compra']] = it.cant_por_unidad_compra;
        if (!row[prodIdx['unidad_venta']]) row[prodIdx['unidad_venta']] = it.unidad_venta;
        if (row[prodIdx['permite_fraccion']] === undefined) row[prodIdx['permite_fraccion']] = it.permite_fraccion ? 1 : 0;
        if (row[prodIdx['permite_entero']] === undefined) row[prodIdx['permite_entero']] = it.permite_entero ? 1 : 0;
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
        prodAoa.push(newRow);
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
      ppAoa.push(ppRow);
    }

    // Escribir y guardar
    this.writeSheet(wb, 'Proveedores', provAoa);
    this.writeSheet(wb, 'Productos', prodAoa);
    this.writeSheet(wb, 'ProveedorProductos', ppAoa);

    if ((handle as any)?.createWritable) {
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const writable = await (handle as any).createWritable();
      await writable.write(wbout);
      await writable.close();
    } else {
      XLSX.writeFile(wb, filename || 'merceria.xlsx');
    }
  }

  // ======== Proveedores: listar, obtener, actualizar ========

  private async readProvSheet() {
    const handle = await this.ensureHandle();
    const { wb } = await this.readWorkbook(handle);
    const provAoa = this.ensureSheet(wb, 'Proveedores');
    const idx = (hdrs: string[]) =>
      Object.fromEntries(hdrs.map((h, i) => [h, i])) as Record<string, number>;
    const map = idx(provAoa[0] as string[]);
    return { handle, wb, provAoa, map };
  }

  async listProveedores(): Promise<Array<{
    id_proveedor: string; nombre: string; telefono: string;
    cuit?: string; email?: string; direccion?: string; notas?: string;
  }>> {
    const { provAoa, map } = await this.readProvSheet();
    const out: any[] = [];
    for (let r = 1; r < provAoa.length; r++) {
      const row = provAoa[r] || [];
      const id = String(row[map['id_proveedor']] || '').trim();
      if (!id) continue;
      out.push({
        id_proveedor: id,
        nombre: String(row[map['nombre']] || '').trim(),
        telefono: String(row[map['telefono']] || '').trim(),
        cuit: String(row[map['cuit']] || '').trim(),
        email: String(row[map['email']] || '').trim(),
        direccion: String(row[map['direccion']] || '').trim(),
        notas: String(row[map['notas']] || '').trim(),
      });
    }
    // ordenar por nombre asc
    out.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return out as any;
  }

  async getProveedor(id_proveedor: string) {
    const { provAoa, map } = await this.readProvSheet();
    for (let r = 1; r < provAoa.length; r++) {
      const row = provAoa[r] || [];
      const id = String(row[map['id_proveedor']] || '').trim();
      if (id === id_proveedor) {
        return {
          rowIndex: r, // lo devolvemos para update
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

  async updateProveedorBasic(p: {
    id_proveedor: string; nombre: string; telefono: string;
    cuit?: string; email?: string; direccion?: string; notas?: string;
  }) {
    const { handle, wb, provAoa, map } = await this.readProvSheet();

    // buscar fila
    let rowIndex = -1;
    for (let r = 1; r < provAoa.length; r++) {
      const row = provAoa[r] || [];
      const id = String(row[map['id_proveedor']] || '').trim();
      if (id === p.id_proveedor) { rowIndex = r; break; }
    }
    if (rowIndex < 0) throw new Error('Proveedor no encontrado en Excel.');

    // escribir valores
    const row = provAoa[rowIndex];
    row[map['nombre']] = p.nombre ?? '';
    row[map['telefono']] = p.telefono ?? '';
    row[map['cuit']] = p.cuit ?? '';
    row[map['email']] = p.email ?? '';
    row[map['direccion']] = p.direccion ?? '';
    row[map['notas']] = p.notas ?? '';

    // persistir
    this.writeSheet(wb, 'Proveedores', provAoa);
    if ((handle as any)?.createWritable) {
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const writable = await (handle as any).createWritable();
      await writable.write(wbout);
      await writable.close();
    } else {
      XLSX.writeFile(wb, 'merceria.xlsx');
    }
  }

  // Fallback para navegadores sin FS Access: descarga directa
  private async guardarConDescarga(proveedor: ProveedorPaso1, items: ItemProveedor[]) {
    const wb = XLSX.utils.book_new();

    // Tipamos explícitamente como any[][] para evitar las tuplas literales de headers
    const prov: any[][] = [Array.from(headers.Proveedores) as any[]];
    const prod: any[][] = [Array.from(headers.Productos) as any[]];
    const pp: any[][] = [Array.from(headers.ProveedorProductos) as any[]];

    const provId = `prov_${Date.now()}`;

    prov.push([
      provId,
      proveedor.nombre ?? '',
      proveedor.cuit ?? '',
      proveedor.telefono ?? '',
      proveedor.email ?? '',
      proveedor.direccion ?? '',
      proveedor.notas ?? ''
    ] as any[]);

    for (const it of items) {
      const prodId = `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      prod.push([
        prodId,
        it.nombre_base ?? '',
        it.variante ?? '',
        '',
        it.unidad_compra,
        it.cant_por_unidad_compra,
        it.unidad_venta,
        it.permite_fraccion ? 1 : 0,
        it.permite_entero ? 1 : 0,
        0,
        0
      ] as any[]);

      pp.push([
        provId,
        prodId,
        it.unidad_compra,
        it.cant_por_unidad_compra,
        it.precio_compra,
        nowStr()
      ] as any[]);
    }

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prov), 'Proveedores');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prod), 'Productos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pp), 'ProveedorProductos');

    XLSX.writeFile(wb, 'merceria.xlsx');
  }


  // dentro de la clase ExcelService, agregar:
  async warmupStructure(): Promise<boolean> {
    try {
      // no pedimos diálogo: si no hay handle guardado, salimos silenciosamente
      const handle = await this.idbGet<any>(this.HANDLE_KEY);
      if (!handle) return false;
      const ok = await this.verifyRW(handle);
      if (!ok) return false;

      // abrir workbook y asegurar TODAS las hojas (sin mostrar nada al usuario)
      const { wb } = await this.readWorkbook(handle);
      (Object.keys(headers) as Array<keyof typeof headers>).forEach((name) => {
        const aoa = this.ensureSheet(wb, name);
        this.writeSheet(wb, name, aoa);
      });

      // guardar de vuelta (sin diálogos)
      if ((handle as any)?.createWritable) {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const writable = await (handle as any).createWritable();
        await writable.write(wbout);
        await writable.close();
      }
      return true;
    } catch {
      return false;
    }
  }

}



