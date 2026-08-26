import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);
  });

  afterEach(async () => {
    await app.close();
  });

  it('exposes the health endpoint', async () => {
    const response = await fetch(`${await app.getUrl()}/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });
});
