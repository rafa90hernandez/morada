import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import { json, urlencoded } from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3001;
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';

  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
    }),
  );

  app.use(json({ limit: '1mb' }));
  app.use(
    urlencoded({
      extended: true,
      limit: '1mb',
    }),
  );

  app.use(compression());

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Morada API')
    .setDescription(
      'API for secure housing, room transfers and accommodation exchange for Brazilians living in Ireland.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
}

void bootstrap();
