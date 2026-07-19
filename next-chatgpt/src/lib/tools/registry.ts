import { ToolDefinition, ToolExecutor, ToolRegistry } from "./types";

class ToolRegistryService {
  private registry: ToolRegistry = new Map();

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
    return this.registry.get(name)?.definition.meta;
  }

  /** 判断工具是否自动执行 */
  isAutoExecute(name: string): boolean {
    return this.registry.get(name)?.definition.meta.autoExecute ?? false;
  }

  /** 清空注册表 */
  clear(): void {
    this.registry.clear();
  }
}

/** 全局单例 */
export const toolRegistry = new ToolRegistryService();
