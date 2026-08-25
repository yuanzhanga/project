import { ToolDefinition, ToolExecutor, ToolMeta, ToolRegistry } from "./types";

class ToolRegistryService {
  private registry: ToolRegistry = new Map();
  private metaMap = new Map<string, ToolMeta>();

  /** 注册一个工具执行器 */
  register(executor: ToolExecutor): void {
    const name = executor.definition.function.name;
    if (this.registry.has(name)) {
      console.warn(`[ToolRegistry] 工具 "${name}" 已存在，将被覆盖`);
    }
    this.registry.set(name, executor);
  }

  /** 获取单个工具执行器 */
  get(name: string): ToolExecutor | undefined {
    return this.registry.get(name);
  }

  /** 获取所有工具执行器 */
  getAll(): ToolExecutor[] {
    return Array.from(this.registry.values());
  }

  /** 获取不含 meta 的纯 LLM 工具定义列表（用于发送给 API） */
  getDefinitions(): Array<Omit<ToolDefinition, "meta">> {
    return this.getAll().map((executor) => {
      const { meta: _meta, ...definition } = executor.definition;
      return definition;
    });
  }

  /** 获取工具的 meta 信息 */
  getMeta(name: string) {
    return this.registry.get(name)?.definition.meta ?? this.metaMap.get(name);
  }

  /** 判断工具是否自动执行 */
  isAutoExecute(name: string): boolean {
    return (
      this.registry.get(name)?.definition.meta.autoExecute ??
      this.metaMap.get(name)?.autoExecute ??
      false
    );
  }

  /** 前端从 /api/tools 拉取元数据填充（不注册执行器） */
  setMetaList(list: Array<{ name: string; meta: ToolMeta }>): void {
    this.metaMap = new Map(list.map((x) => [x.name, x.meta]));
  }

  /** 清空注册表 */
  clear(): void {
    this.registry.clear();
    this.metaMap.clear();
  }
}

/** 全局单例 */
export const toolRegistry = new ToolRegistryService();
