# Week 2 改进计划 (Stabilized)

**分支:** `develop/week2-db`  
**基线:** v0.1.0 (commit 70fe7d8) - 174 测试全通过  
**目标:** v0.2.0 - PostgreSQL 集成 + 完整测试通过

---

## 整体策略

从 Week 1 稳定版本开始，逐步添加 Week 2 功能，每个步骤都确保 100% 测试通过。

```
Week 1 (stable) ✅
    ↓
+ PostgreSQL setup 
+ Prisma Schema → Test
    ↓
+ Database migration
+ Service layer update → Test
    ↓
+ Controller adaptation
+ Full API test → Test
    ↓
+ Auth middleware (careful integration) → Test
    ↓
Week 2 (v0.2.0) ✅ Ready
```

---

## Day 1-2: 数据库 + Prisma 集成

### 目标
- PostgreSQL 运行（Docker）
- Prisma Schema 完整
- 所有 migration 应用
- 零测试失败

### 步骤

#### 1.1 Setup Docker + PostgreSQL
```bash
docker-compose up -d  # 启动 PostgreSQL
psql -U apirouter -d apirouter_dev -c "\dt"  # 验证连接
```

#### 1.2 创建 Prisma Schema
文件: `backend/prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model ApiKey {
  id        String   @id @default(cuid())
  name      String
  key       String   @unique
  providers String[]
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  expiresAt DateTime?
  lastUsedAt DateTime?
}

model ProviderConfig {
  id          String   @id @default(cuid())
  name        String   @unique
  apiKey      String?
  isConfigured Boolean @default(false)
  createdAt   DateTime @default(now())
  lastChecked DateTime?
}

model UsageStats {
  id          String   @id @default(cuid())
  apiKeyId    String
  providerId  String
  requestCount Int    @default(0)
  successCount Int    @default(0)
  errorCount   Int    @default(0)
  totalLatency Int    @default(0)
  createdAt   DateTime @default(now())
  lastUsedAt  DateTime @default(now())
}

model ApiLog {
  id          String   @id @default(cuid())
  apiKeyId    String
  providerId  String
  endpoint    String
  method      String
  statusCode  Int?
  latency     Int
  errorMessage String?
  createdAt   DateTime @default(now())
}
```

#### 1.3 创建 Migration
```bash
npx prisma migrate dev --name init
```

#### 1.4 运行测试
```bash
npm test  # 期望：174/174 通过
```

**检查点:** 所有原有测试仍通过，没有数据库相关错误

---

## Day 3: Service 层迁移

### 目标
- PrismaService 替换 KeyService/ProviderService
- 100% 功能对等（in-memory → database）
- 所有原有测试通过

### 步骤

#### 3.1 创建 PrismaService
文件: `backend/src/services/PrismaService.ts`

包含方法：
- `createKey()`
- `listKeys()`
- `getKey()`
- `deleteKey()`
- `initializeProvider()`
- `updateProvider()`
- `getProvider()`
- `listProviders()`
- `recordUsage()`
- `getUsageStats()`

#### 3.2 更新 Controllers
```typescript
// KeyController.ts
import PrismaService from '../services/PrismaService';

export class KeyController {
  static async createKey(req: Request, res: Response) {
    try {
      const key = await PrismaService.createKey(req.body);
      res.status(201).json(key);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
  // ... 其他方法
}
```

#### 3.3 运行完整测试
```bash
npm test  # 期望：174/174 通过
```

**检查点:** Controllers 使用数据库，API 响应格式完全兼容

---

## Day 4: Auth 中间件（小心集成）

### 目标
- Auth 中间件与 Prisma 正确交互
- 所有 API 正确验证密钥
- 100% 测试通过

### 关键问题 & 解决方案

#### 问题 1: Prisma 单例导致测试间污染
**原因:** 不同测试共享同一个 Prisma 连接

**解决:**
```typescript
// 创建 test-only 的 reset 函数
export async function resetDatabase() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    await prisma.apiLog.deleteMany();
    await prisma.usageStats.deleteMany();
    await prisma.apiKey.deleteMany();
    await prisma.providerConfig.deleteMany();
  } finally {
    await prisma.$disconnect();
  }
}

// 在每个测试的 afterEach 中调用
afterEach(async () => {
  await resetDatabase();
});
```

#### 问题 2: 测试键名重复导致冲突
**原因:** 多个测试使用 `name: 'search-key'` 同名键

**解决:**
```typescript
import { v4 as uuid } from 'uuid';

// 使用唯一键名
const keyName = `test-key-${uuid()}`;
```

#### 问题 3: Auth 中间件在测试中验证失败
**原因:** 键创建和验证不同步

**解决:**
```typescript
// auth.test.ts
it('should accept valid Bearer format', async () => {
  // 1. 直接创建键
  const testKey = await PrismaService.createKey({
    name: `auth-test-${uuid()}`,
    providers: ['brave'],
  });
  
  // 2. 明确刷新数据库连接（可选）
  // 或等待一小段时间
  await new Promise(r => setTimeout(r, 10));
  
  // 3. 验证可以读取回来
  const retrieved = await PrismaService.getKeyByString(testKey.key);
  expect(retrieved).toBeDefined();
  
  // 4. 再用 HTTP 请求测试 auth 中间件
  const response = await request(app)
    .get('/protected')
    .set('Authorization', `Bearer ${testKey.key}`)
    .expect(200);
});
```

### 步骤

#### 4.1 实现 Auth 中间件
```typescript
// src/middleware/auth.ts
export async function verifyApiKey(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization' });
  }
  
  const key = authHeader.slice(7);
  
  try {
    const apiKey = await PrismaService.getKeyByString(key);
    
    if (!apiKey || !apiKey.isActive) {
      return res.status(401).json({ error: 'Invalid key' });
    }
    
    req.keyId = apiKey.id;
    req.keyProviders = apiKey.providers;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Auth failed' });
  }
}
```

#### 4.2 应用到路由
```typescript
// src/server.ts
app.post('/api/proxy/brave/search',
  verifyApiKey,
  requireProvider('brave'),
  BraveSearchController.search
);
```

#### 4.3 更新测试
所有路由测试都需要包含有效的 Authorization header

#### 4.4 运行测试
```bash
npm test  # 期望：174/174 通过 (100%)
```

**检查点:** Auth 中间件正确验证，所有测试通过

---

## Day 5: 完整验证 & 发布

### 目标
- 所有 API 端点功能正常
- E2E 场景完整
- 文档更新完整
- v0.2.0 发布

### 步骤

#### 5.1 功能验证清单
- [ ] Key 创建和删除
- [ ] Provider 配置更新
- [ ] Search API with Auth
- [ ] Usage stats 记录和聚合
- [ ] 数据持久化

#### 5.2 创建 CHANGELOG
```markdown
## v0.2.0 (2026-02-0X)

### 新增功能
- PostgreSQL 数据库集成
- API Key 数据持久化
- Usage statistics 聚合
- Provider 配置持久化
- API 日志记录

### 改进
- 数据库支持无限扩展
- 实时统计聚合
- 完整审计日志

### 兼容性
- ✅ 100% 向后兼容 v0.1.0
- ✅ 无 breaking changes
- ✅ API 格式完全相同
```

#### 5.3 标记版本
```bash
git tag -a v0.2.0 -m "PostgreSQL integration + stable tests"
git push origin develop/week2-db --tags
```

#### 5.4 创建 GitHub Release
- 标题: `v0.2.0 - Database Integration`
- 内容: CHANGELOG
- 附件: 测试覆盖率报告

---

## 测试策略

### 关键原则
1. **每个步骤都要 100% 测试通过**
   - 不要跳过失败的测试
   - 不要用 `.skip` 或 `.only` 临时修复

2. **数据库隔离**
   ```typescript
   beforeEach(async () => {
     await resetDatabase();
   });
   
   afterEach(async () => {
     await resetDatabase();
   });
   ```

3. **唯一键名**
   ```typescript
   const uniqueName = `${testName}-${uuid()}`;
   ```

### 运行命令
```bash
# 完整测试
npm test

# 特定文件
npm test -- backend/__tests__/services/PrismaService.test.ts

# 单个测试
npm test -- --reporter=verbose "should create key"

# 覆盖率
npm test -- --coverage
```

---

## 风险识别和缓解

| 风险 | 可能性 | 影响 | 缓解 |
|------|--------|------|------|
| Prisma 单例污染 | 高 | 测试失败 | afterEach 强制清理 + 唯一键名 |
| 数据库连接超时 | 中 | 间歇失败 | 重试逻辑 + 连接池 |
| 迁移失败 | 低 | 阻塞开发 | 预先验证 migration 脚本 |
| 向后兼容性破坏 | 低 | API 变更 | 严格验证响应格式 |

---

## 成功标准

✅ **完成时：**
- 174/174 测试通过（100%）
- PostgreSQL 运行正常
- 所有 API 端点功能完整
- 数据库数据持久化验证
- 文档完整更新
- v0.2.0 发布完成

📊 **质量指标：**
- 测试覆盖率 ≥ 80%
- 0 个失败测试
- 0 个待修复 issue
- 所有 TypeScript 类型正确

---

## 时间表

| 阶段 | 日期 | 时长 | 任务 |
|------|------|------|------|
| Day 1-2 | 2/2-2/3 | 2 天 | DB + Prisma 集成 |
| Day 3 | 2/4 | 1 天 | Service 层迁移 |
| Day 4 | 2/5 | 1 天 | Auth 中间件 |
| Day 5 | 2/6 | 0.5 天 | 验证 + 发布 |
| **总计** | | **4.5 天** | v0.2.0 完成 |

---

**下一步:** 准备好时，运行 `npm test` 验证基线，然后开始 Day 1。

Good luck! 🚀
