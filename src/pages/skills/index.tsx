import { Card, Typography } from "antd";

export default function SkillsPage() {
  return (
    <Card>
      <Typography.Title level={3}>技能管理</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        阶段四会在这里扫描、展示并启用或禁用 Pi Skills。
      </Typography.Paragraph>
    </Card>
  );
}
