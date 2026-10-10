import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * - Routes /api/* : réponses JSON propres.
 * - Pages inconnues : renvoie la page 404.html du site avec le bon code HTTP.
 */
@Catch()
export class NotFoundPageFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');
  private readonly page404: string;

  constructor(publicDir: string) {
    this.page404 = join(publicDir, '404.html');
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    const isApi = req.path.startsWith('/api/') || req.path === '/api';

    if (!isApi && status === HttpStatus.NOT_FOUND && req.method === 'GET' && existsSync(this.page404)) {
      res.status(404).sendFile(this.page404);
      return;
    }

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      res.status(status).json(typeof body === 'string' ? { statusCode: status, message: body } : body);
      return;
    }

    res.status(status).json({ statusCode: status, message: 'Erreur interne du serveur' });
  }
}
