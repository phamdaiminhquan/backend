import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Coffee Shop Revenue Management API')
    .setDescription(
      'A comprehensive backend service for managing a coffee shop\'s revenue with categories, products, orders, and revenue reporting',
    )
    .setVersion('1.0')
    .addTag('categories', 'Category management endpoints')
    .addTag('products', 'Product management endpoints')
    .addTag('orders', 'Order management endpoints')
    .addTag('revenue', 'Revenue reporting endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Coffee Shop API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`Swagger documentation available at: http://localhost:${process.env.PORT ?? 3000}/api`);
}
bootstrap();
