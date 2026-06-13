# API 路由

## 入口
所有 Action3 API 请求统一发送到:
```
POST /api/action3
Content-Type: application/json

{ "action": "actionName", ...params }
```

## Actions

### goal.*
| Action | 描述 |
|--------|------|
| `goal.create` | 创建目标 |
| `goal.list` | 获取目标列表 |
| `goal.get` | 获取单个目标详情 |
| `goal.update` | 更新目标 |
| `goal.delete` | 删除目标 |
| `goal.analyze` | AI 分析目标 |
| `goal.split` | AI 分解为里程碑和任务 |

### task.*
| Action | 描述 |
|--------|------|
| `task.list` | 获取任务列表 |
| `task.create` | 创建任务 |
| `task.update` | 更新任务 |
| `task.delete` | 删除任务 |
| `task.complete` | 标记完成 |
| `task.today` | 获取今日任务 |

### assessment.*
| Action | 描述 |
|--------|------|
| `assessment.run` | 运行评估 |
| `assessment.submit` | 提交答案 |

### research.*
| Action | 描述 |
|--------|------|
| `research.do` | 执行网络调研 |

### aiWorkflow.*
| Action | 描述 |
|--------|------|
| `aiWorkflow.createGoal` | AI 创建完整目标 |
| `aiWorkflow.analyzeAndSplit` | 分析并分解 |

### achievement.*
| Action | 描述 |
|--------|------|
| `achievement.list` | 获取成就列表 |
| `achievement.unlock` | 解锁成就 |
| `achievement.check` | 检查成就触发条件 |

### calendar.*
| Action | 描述 |
|--------|------|
| `calendar.list` | 获取事件列表 |
| `calendar.add` | 添加事件 |
| `calendar.delete` | 删除事件 |
| `calendar.freeTime` | 分析空闲时间 |
| `calendar.importIcal` | 导入 ICS 文件 |

### reminder.*
| Action | 描述 |
|--------|------|
| `reminder.set` | 设置提醒 |
| `reminder.delete` | 删除提醒 |

### progress.*
| Action | 描述 |
|--------|------|
| `progress.get` | 获取用户进度 |
| `progress.update` | 更新进度 |

### recommend.*
| Action | 描述 |
|--------|------|
| `recommend.skills` | 推荐技能 |
| `recommend.paths` | 推荐学习路径 |
| `recommend.tasks` | 推荐任务 |

### skillTree.*
| Action | 描述 |
|--------|------|
| `skillTree.get` | 获取技能树 |
| `skillTree.updateMastery` | 更新掌握度 |

### classroom.*
| Action | 描述 |
|--------|------|
| `classroom.start` | 开始课堂 |
| `classroom.chat` | 课堂对话 |

### voiceAssistant.*
| Action | 描述 |
|--------|------|
| `voiceAssistant.greeting` | 生成问候语 |
| `voiceAssistant.chat` | AI 对话 |

## 客户端调用

使用 `src/common/action3/api-client.ts` 中的封装:
```typescript
import { action3Api } from '~/common/action3/api-client';
const result = await action3Api('goal.list', {});
```

或使用 React Query hooks:
```typescript
import { useAction3Goals } from '~/common/action3/api-hooks';
const { data } = useAction3Goals();
```
