import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home'; // <-- sin “.component”
import { ProveedoresComponent } from './pages/proveedores/proveedores';
import { CrearProveedorComponent } from './pages/crear-proveedor/crear-proveedor';
import { CrearProductosComponent } from './pages/proveedores/crear-productos/crear-productos';
import { ModificarProveedorComponent } from './pages/proveedores/modificar-proveedor/modificar-proveedor';

export const routes: Routes = [
  { path: 'home', component: HomeComponent, pathMatch: 'full' },
  { path: 'proveedores', component: ProveedoresComponent, pathMatch: 'full' },
  { path: 'proveedores/crear', component: CrearProveedorComponent },
  { path: 'proveedores/crear/productos', component: CrearProductosComponent},
  { path: 'proveedores/modificar', component: ModificarProveedorComponent},

  { path: '**', redirectTo: ''}

];