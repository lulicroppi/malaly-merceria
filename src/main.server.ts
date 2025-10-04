// src/main.server.ts
import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { RootComponent } from './app/root/root';
import { appConfig } from './app/app.config.server';

const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(RootComponent, appConfig, context);

export default bootstrap;