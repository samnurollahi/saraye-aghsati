import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new BadRequestException(
          errors.flatMap((error) =>
            Object.entries(error.constraints ?? {}).map(
              ([constraint, message]) =>
                constraint === 'whitelistValidation'
                  ? `فیلد ${error.property} مجاز نیست.`
                  : message,
            ),
          ),
        ),
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('سیستم وام‌دهی لوازم خانگی')
    .setDescription('APIهای سیستم وام‌دهی لوازم خانگی')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
