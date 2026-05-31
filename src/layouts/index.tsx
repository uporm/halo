import { App } from "antd";
import { Outlet } from "umi";

import styles from "./index.less";

export default function Layout() {
  return (
    <App>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1>Halo</h1>
            <p>Electron AI Agent</p>
          </div>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </App>
  );
}
