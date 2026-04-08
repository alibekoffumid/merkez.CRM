import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Row, Col, Statistic, Space, message, Typography } from 'antd';
import { 
  PlusOutlined, 
  CloseOutlined, 
  FileSyncOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  ClockCircleOutlined,
  DollarCircleOutlined,
  CreditCardOutlined,
  RollbackOutlined
} from '@ant-design/icons';
import { etaxesService } from '../services/etaxesService';
import { FiscalTransaction, FiscalStats } from '../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ETaxesDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FiscalStats | null>(null);
  const [transactions, setTransactions] = useState<FiscalTransaction[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, transData] = await Promise.all([
        etaxesService.getStats(),
        etaxesService.getTransactions()
      ]);
      setStats(statsData);
      setTransactions(transData);
    } catch (error) {
      message.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShift = async () => {
    setActionLoading(true);
    try {
      await etaxesService.openShift();
      message.success('Shift opened successfully');
      loadData();
    } catch (error: any) {
      message.error(error.message || 'Failed to open shift');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseShift = async () => {
    setActionLoading(true);
    try {
      await etaxesService.closeShift();
      message.success('Shift closed and Z-Report generated');
      loadData();
    } catch (error: any) {
      message.error(error.message || 'Failed to close shift');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'order_id',
      key: 'order_id',
      render: (text: string) => <Text copyable ellipsis={{ tooltip: text }}>{text.substring(0, 8)}</Text>,
    },
    {
      title: 'Fiscal ID',
      dataIndex: 'fiscal_id',
      key: 'fiscal_id',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount: number) => <Text strong>{amount.toFixed(2)} AZN</Text>,
    },
    {
      title: 'Payment',
      dataIndex: 'payment_type',
      key: 'payment_type',
      render: (type: string) => (
        <Space>
          {type === 'cash' ? <DollarCircleOutlined className="text-green-500" /> : <CreditCardOutlined className="text-blue-500" />}
          <span className="capitalize">{type === 'cash' ? 'Nəğd' : 'Kart'}</span>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'fiscal_status',
      key: 'fiscal_status',
      render: (status: string) => {
        let color = 'default';
        let icon = <ClockCircleOutlined />;
        if (status === 'success') { color = 'success'; icon = <CheckCircleOutlined />; }
        if (status === 'error') { color = 'error'; icon = <CloseCircleOutlined />; }
        if (status === 'refunded') { color = 'warning'; icon = <RollbackOutlined />; }
        return <Tag icon={icon} color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Date',
      dataIndex: 'fiscal_at',
      key: 'fiscal_at',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <Title level={3} className="!mb-1 text-gray-800">Фискальный Дашборд</Title>
          <Text type="secondary">Мониторинг транзакций и управление сменой</Text>
        </div>
        <Space size="middle">
          {stats?.shiftStatus === 'closed' ? (
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleOpenShift}
              loading={actionLoading}
              className="bg-green-600 hover:bg-green-700 h-10 px-6 rounded-lg font-medium"
            >
              Открыть Смену
            </Button>
          ) : (
            <Button 
              danger 
              icon={<CloseOutlined />} 
              onClick={handleCloseShift}
              loading={actionLoading}
              className="h-10 px-6 rounded-lg font-medium"
            >
              Закрыть Смену (Z-Report)
            </Button>
          )}
          <Button 
            icon={<FileSyncOutlined />} 
            onClick={loadData}
            className="h-10 px-4 rounded-lg"
          />
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="rounded-xl border-0 shadow-sm overflow-hidden border-l-4 border-green-500">
            <Statistic 
              title="Наличные (Сегодня)" 
              value={stats?.todayCash || 0} 
              precision={2}
              suffix="AZN"
              prefix={<DollarCircleOutlined className="text-green-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="rounded-xl border-0 shadow-sm overflow-hidden border-l-4 border-blue-500">
            <Statistic 
              title="Карты (Сегодня)" 
              value={stats?.todayCard || 0} 
              precision={2}
              suffix="AZN"
              prefix={<CreditCardOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="rounded-xl border-0 shadow-sm overflow-hidden border-l-4 border-orange-500">
            <Statistic 
              title="Возвраты (Сегодня)" 
              value={stats?.todayRefunds || 0} 
              precision={2}
              suffix="AZN"
              prefix={<RollbackOutlined className="text-orange-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="rounded-xl border-0 shadow-sm overflow-hidden border-l-4 border-merkez-blue">
            <Statistic 
              title="Статус Смены" 
              value={stats?.shiftStatus === 'open' ? 'ОТКРЫТА' : 'ЗАКРЫТА'}
              valueStyle={{ color: stats?.shiftStatus === 'open' ? '#52c41a' : '#ff4d4f', fontWeight: 'bold' }}
              prefix={<FileSyncOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card 
        className="rounded-xl border-0 shadow-sm overflow-hidden"
        title={
          <div className="py-2">
            <Title level={4} className="!mb-0">Последние Транзакции</Title>
          </div>
        }
      >
        <Table 
          columns={columns} 
          dataSource={transactions} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: true }}
          className="custom-table"
        />
      </Card>
    </div>
  );
};

export default ETaxesDashboard;
