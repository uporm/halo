import { Card, Typography } from "antd";

export default function NewTaskPage() {
  return (
    <Card>
      <Typography.Title level={3}>新建任务</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        阶段二会在这里补充任务标题、描述输入和跳转到聊天页的流程。
      </Typography.Paragraph>
    </Card>
  );
}
