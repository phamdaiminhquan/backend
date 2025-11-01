import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });

  // Serve static files from uploads directory
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

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on port 3000');
  });
  console.log(`Application is running on: http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`Swagger documentation available at: http://localhost:${process.env.PORT ?? 3000}/api/docs`);
}
bootstrap();
