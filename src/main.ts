import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import { existsSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { NotFoundPageFilter } from './site/not-found.filter';

// Le site est copié dans dist/public au build ; on garde public/ en secours.
export const PUBLIC_DIR = [join(__dirname, 'public'), join(__dirname, '..', 'public')].find((d) =>
  existsSync(join(d, 'index.html')),
) ?? join(__dirname, 'public');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  // Hostinger place l'application derrière un proxy : nécessaire pour
  // connaître la vraie IP du visiteur (limitation anti-abus).
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'"],
          'script-src-attr': ["'none'"],
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
          'img-src': ["'self'", 'data:', 'https://images.unsplash.com'],
          'connect-src': ["'self'"],
          'frame-ancestors': ["'self'"],
          'form-action': ["'self'", 'mailto:'],
          'upgrade-insecure-requests': [],
        },
      },
      crossOriginEmbedderPolicy: false,
      // Autorise l'affichage des images du site ailleurs (signature email, webmail, réseaux sociaux).
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );
  app.useGlobalFilters(new NotFoundPageFilter(PUBLIC_DIR));

  // Fichiers du site : index.html, assets, robots.txt, sitemap.xml…
  app.useStaticAssets(PUBLIC_DIR, {
    index: 'index.html',
    extensions: ['html'],
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else if (path.includes(`${join('public', 'assets')}`)) {
        res.setHeader('Cache-Control', 'public, max-age=604800');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    },
  });

  app.enableShutdownHooks();

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`ImmoFilms.ch en ligne sur le port ${port}`, 'Bootstrap');
}

bootstrap();
