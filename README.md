# MyVue3RubbshRroject
练习的辣鸡vue项目，做个记录

```bash
# 完整分析某位作者的贡献
contrib-skill analyze --repo ./ --author "Xu Yilin" --mode full
contrib-skill analyze --repo ./project --author "Xu Yilin" --mode full

# 指定分支区间、时间窗口与目标岗位
contrib-skill analyze \
  --repo ./project \
  --author "Xu Yilin" \
  --base main \
  --branch feature/order \
  --since 2025-01-01 \
  --until 2025-06-01 \
  --mode resume \
  --target-role "Java后端开发工程师" \
  --output ./output

# 分析所有作者（简历材料默认生成给提交数最高的作者）
contrib-skill analyze --repo ./project --all-authors

# 严格模式：只保留 safe 等级的简历表述
contrib-skill analyze --repo ./project --author alice --strict
```

