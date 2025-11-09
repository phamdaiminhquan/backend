import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  // CORS
  const isProd = process.env.NODE_ENV === 'production';
  let origin: boolean | string[];

  if (isProd) {
    if (!process.env.VALID_FE_URL) {
      logger.error('VALID_FE_URL is required in production');
      process.exit(1);
    }
    origin = process.env.VALID_FE_URL.split(',').map((s) => s.trim()).filter(Boolean);
  } else {
    origin = true;
  }

  logger.log(`CORS configured: ${JSON.stringify({ NODE_ENV: process.env.NODE_ENV, isProd, origin })}`);

  app.enableCors({
    origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  });

  // Log all requests để debug CORS
  app.use((req, res, next) => {
    logger.verbose(`${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
    next();
  });

  // Serve static files
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Coffee Shop Revenue Management API')
    .setDescription(
      'A comprehensive backend service for managing a coffee shop\'s revenue with categories, products, orders, revenue reporting, and file uploads',
    )
    .setVersion('1.0')
    .addTag('auth', 'Authentication and user profile endpoints')
    .addTag('categories', 'Category management endpoints')
    .addTag('products', 'Product management endpoints')
    .addTag('orders', 'Order management endpoints')
    .addTag('revenue', 'Revenue reporting endpoints')
    .addTag('upload', 'File upload endpoints for product images')
    .addTag('rewards', 'Reward points management endpoints')
    .addTag('contact', 'Contact and feedback endpoints')
    .addTag('stats', 'Dashboard statistics endpoints')
    .addTag('reviews', 'Public customer review endpoints')
    .addTag('admin/reviews', 'Admin review management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Coffee Shop API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`Server running on port ${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`Auth disabled: ${process.env.AUTH_DISABLED || 'false'}`);
  logger.log(`Documentation: http://localhost:${port}/docs`);
}
bootstrap();
