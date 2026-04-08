import React from 'react';
import { Tabs, Card } from 'antd';
import { DashboardOutlined, SettingOutlined } from '@ant-design/icons';
import ETaxesDashboard from './components/ETaxesDashboard';
import ETaxesSettings from './components/ETaxesSettings';

const ETaxesModule: React.FC = () => {
  const items = [
    {
      key: 'dashboard',
      label: (
        <span>
          <DashboardOutlined />
          Dashboard
        </span>
      ),
      children: <ETaxesDashboard />,
    },
    {
      key: 'settings',
      label: (
        <span>
          <SettingOutlined />
          Settings
        </span>
      ),
      children: <ETaxesSettings />,
    },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30">
      <Card className="rounded-2xl border-0 shadow-xl shadow-gray-200/40 overflow-hidden">
        <Tabs 
          defaultActiveKey="dashboard" 
          items={items} 
          size="large"
          className="custom-tabs px-4"
          tabBarStyle={{ marginBottom: 24, borderBottom: '1px solid #f0f0f0' }}
        />
      </Card>
    </div>
  );
};

export default ETaxesModule;
