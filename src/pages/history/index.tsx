import { Card, Typography } from "antd";

export default function HistoryPage() {
  return (
    <Card>
      <Typography.Title level={3}>历史任务</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        阶段三会在这里接入 SQLite 持久化记录与任务回放。
      </Typography.Paragraph>
    </Card>
  );
}
